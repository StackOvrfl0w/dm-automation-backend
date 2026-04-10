const { sendSuccess, sendError } = require('../utils/response');
const { verifyWebhookSignature } = require('../utils/webhook');
const WebhookService = require('../services/WebhookService');
const config = require('../config/env');

const verifyWebhook = (req, res) => {
  const challenge = req.query['hub.challenge'];
  const verifyToken = req.query['hub.verify_token'];
  const mode = req.query['hub.mode'];

  if (mode === 'subscribe' && verifyToken === config.meta.webhookVerifyToken) {
    return res.status(200).send(challenge);
  }

  return sendError(res, 'Webhook verification failed', 403);
};

const handleWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-hub-signature-256'];

    if (!signature) {
      return sendError(res, 'Missing webhook signature', 400);
    }

    const rawBody = JSON.stringify(req.body);

    const isValid = verifyWebhookSignature(rawBody, signature);

    if (!isValid) {
      return sendError(res, 'Invalid webhook signature', 403);
    }

    await WebhookService.processWebhookEvent(req.body);

    return sendSuccess(res, null, 'Webhook processed', 200);
  } catch (error) {
    console.error('Webhook handling error:', error.message);
    next(error);
  }
};

module.exports = {
  verifyWebhook,
  handleWebhook,
};
