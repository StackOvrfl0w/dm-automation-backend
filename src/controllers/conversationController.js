const { sendSuccess, sendError } = require('../utils/response');
const Conversation = require('../models/Conversation');
const WebhookEvent = require('../models/WebhookEvent');

const getConversations = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, instagramAccountId } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (instagramAccountId) {
      filter.instagramAccountId = instagramAccountId;
    }

    const scopedFilter = {
      ...filter,
      instagramAccountId: {
        ...(filter.instagramAccountId ? { $eq: filter.instagramAccountId } : {}),
      },
    };

    const conversationsQuery = Conversation.find(scopedFilter)
      .populate({
        path: 'instagramAccountId',
        select: 'userId username instagramUserId accountType isActive connectedAt',
        match: { userId: req.userId },
      })
      .populate('activeFlowId', 'name triggerType isActive')
      .sort({ windowOpensAt: -1, windowClosesAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const conversationsRaw = await conversationsQuery;
    const conversations = conversationsRaw.filter((item) => item.instagramAccountId);

    const totalRaw = await Conversation.find(scopedFilter)
      .populate({
        path: 'instagramAccountId',
        select: 'userId',
        match: { userId: req.userId },
      })
      .lean();

    const total = totalRaw.filter((item) => item.instagramAccountId).length;

    return sendSuccess(res, {
      conversations,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get conversations error:', error.message);
    next(error);
  }
};

const getConversationMessages = async (req, res, next) => {
  try {
    const conversation = await Conversation.findById(req.params.id)
      .populate('instagramAccountId', 'userId instagramUserId username')
      .lean();

    if (!conversation || !conversation.instagramAccountId) {
      return sendError(res, 'Conversation not found', 404);
    }

    if (String(conversation.instagramAccountId.userId) !== String(req.userId)) {
      return sendError(res, 'Access denied', 403);
    }

    const recipientInstagramId = conversation.recipientInstagramId;
    const accountInstagramId = conversation.instagramAccountId.instagramUserId;

    const events = await WebhookEvent.find({
      instagramAccountId: conversation.instagramAccountId._id,
      eventType: { $in: ['direct_message', 'message_send'] },
      $or: [
        { 'rawPayload.senderInstagramId': recipientInstagramId },
        { 'rawPayload.recipientInstagramId': recipientInstagramId },
      ],
    })
      .sort({ createdAt: 1 })
      .lean();

    const messages = events
      .map((event) => {
        const payload = event.rawPayload || {};
        const senderId = payload.senderInstagramId || null;
        const recipientId = payload.recipientInstagramId || null;
        const messageText = payload.message || payload.text || null;
        const timestamp = payload.timestamp ? new Date(payload.timestamp) : event.createdAt;

        if (!messageText) {
          return null;
        }

        let direction = 'system';
        if (senderId && String(senderId) === String(recipientInstagramId)) {
          direction = 'inbound';
        } else if (
          senderId &&
          accountInstagramId &&
          String(senderId) === String(accountInstagramId)
        ) {
          direction = 'outbound';
        } else if (
          recipientId &&
          accountInstagramId &&
          String(recipientId) === String(accountInstagramId)
        ) {
          direction = 'inbound';
        }

        return {
          id: String(event._id),
          direction,
          text: messageText,
          senderInstagramId: senderId,
          recipientInstagramId: recipientId,
          eventType: event.eventType,
          timestamp,
          processed: event.processed,
        };
      })
      .filter(Boolean);

    return sendSuccess(res, {
      conversation: {
        _id: conversation._id,
        recipientInstagramId: conversation.recipientInstagramId,
        status: conversation.status,
        instagramAccountId: conversation.instagramAccountId,
        activeFlowId: conversation.activeFlowId || null,
      },
      messages,
    });
  } catch (error) {
    console.error('Get conversation messages error:', error.message);
    next(error);
  }
};

module.exports = {
  getConversations,
  getConversationMessages,
};
