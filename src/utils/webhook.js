const crypto = require('crypto');
const config = require('../config/env');

const verifyWebhookSignature = (payload, signature) => {
  const hash = crypto
    .createHmac('sha256', config.meta.appSecret)
    .update(payload)
    .digest('hex');

  const expectedSignature = `sha256=${hash}`;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
};

module.exports = {
  verifyWebhookSignature,
};
