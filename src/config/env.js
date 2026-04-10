require('dotenv').config();

// Parse Redis URL to extract host and port
const parseRedisUrl = (url) => {
  const defaultUrl = 'redis://localhost:6379';
  const redisUrl = url || defaultUrl;
  const urlObj = new URL(redisUrl);
  return {
    url: redisUrl,
    host: urlObj.hostname,
    port: parseInt(urlObj.port || '6379', 10),
  };
};

const redisConfig = parseRedisUrl(process.env.REDIS_URL);

module.exports = {
  port: parseInt(process.env.PORT || '3001', 10),
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/dm-automation',
  },
  redis: redisConfig,
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiry: '15m',
    refreshExpiry: '7d',
  },
  meta: {
    appId: process.env.META_APP_ID,
    appSecret: process.env.META_APP_SECRET,
    webhookVerifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN,
    graphApiVersion: process.env.META_GRAPH_API_VERSION || 'v21.0',
    redirectUri: process.env.INSTAGRAM_REDIRECT_URI,
  },
  encryption: {
    key: process.env.TOKEN_ENCRYPTION_KEY,
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },
  client: {
    url: process.env.CLIENT_URL || 'http://localhost:3000',
  },
  nodeEnv: process.env.NODE_ENV || 'development',
};
