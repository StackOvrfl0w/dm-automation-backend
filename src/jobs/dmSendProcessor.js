const Queue = require('bull');
const { connectDB, disconnectDB } = require('../config/database');
const { initRedis, redisClient } = require('../config/redis');
const FlowExecutionService = require('../services/FlowExecutionService');
const config = require('../config/env');

const dmSendQueue = new Queue('dm-send', {
  redis: {
    host: config.redis.host,
    port: config.redis.port,
  },
});

const MAX_ATTEMPTS = 3;
const BACKOFF_DELAY = 5000; // 5 seconds

dmSendQueue.process(MAX_ATTEMPTS, async (job) => {
  const { conversationId, instagramAccountId, stepIndex } = job.data;

  try {
    console.log(`Processing job ${job.id}: DM send for conversation ${conversationId}`);

    const result = await FlowExecutionService.executeFlow(
      conversationId,
      instagramAccountId,
      stepIndex
    );

    return {
      success: true,
      result,
    };
  } catch (error) {
    console.error(`Job ${job.id} failed:`, error.message);

    if (job.attemptsMade < MAX_ATTEMPTS) {
      const delay = BACKOFF_DELAY * Math.pow(2, job.attemptsMade);
      throw new Error(`Retry in ${delay}ms: ${error.message}`);
    }

    throw error;
  }
});

dmSendQueue.on('completed', (job) => {
  console.log(`Job ${job.id} completed`, job.data);
});

dmSendQueue.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed permanently:`, err.message);
});

dmSendQueue.on('error', (error) => {
  console.error('Queue error:', error.message);
});

const startJobProcessor = async () => {
  try {
    await connectDB();
    console.log('✓ MongoDB connected for job processor');

    await initRedis();
    console.log('✓ Redis connected for job processor');

    console.log('✓ DM Send Queue processor started');
  } catch (error) {
    console.error('Failed to start job processor:', error.message);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down job processor gracefully');
  await dmSendQueue.close();
  await disconnectDB();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down job processor gracefully');
  await dmSendQueue.close();
  await disconnectDB();
  process.exit(0);
});

if (require.main === module) {
  startJobProcessor();
}

module.exports = dmSendQueue;
