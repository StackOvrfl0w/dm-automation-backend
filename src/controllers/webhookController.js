const { sendSuccess, sendError } = require('../utils/response');
const { verifyWebhookSignature } = require('../utils/webhook');
const WebhookService = require('../services/WebhookService');
const config = require('../config/env');
const WebhookEvent = require('../models/WebhookEvent');

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

const getWebhookEvents = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, processed, eventType, instagramAccountId } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    if (eventType) {
      filter.eventType = eventType;
    }

    if (processed === 'true' || processed === 'false') {
      filter.processed = processed === 'true';
    }

    if (instagramAccountId) {
      filter.instagramAccountId = instagramAccountId;
    }

    const query = WebhookEvent.find(filter)
      .populate({
        path: 'instagramAccountId',
        select: 'userId username instagramUserId accountType',
        match: { userId: req.userId },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const eventsRaw = await query;
    const events = eventsRaw.filter((item) => item.instagramAccountId);

    const totalRaw = await WebhookEvent.find(filter)
      .populate({
        path: 'instagramAccountId',
        select: 'userId',
        match: { userId: req.userId },
      })
      .lean();

    const total = totalRaw.filter((item) => item.instagramAccountId).length;

    return sendSuccess(res, {
      events,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get webhook events error:', error.message);
    next(error);
  }
};

module.exports = {
  verifyWebhook,
  handleWebhook,
  getWebhookEvents,
};
