const { createClient } = require('redis');
const config = require('./env');

const redisClient = createClient({
  url: config.redis.url,
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 50, 500),
  },
});

redisClient.on('error', (err) => console.error('Redis error:', err));
redisClient.on('connect', () => console.log('✓ Redis connected'));

const initRedis = async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error('✗ Redis connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = {
  redisClient,
  initRedis,
};
