const { sendSuccess, sendError } = require('../utils/response');
const LeadCapture = require('../models/LeadCapture');
const { body, validationResult } = require('express-validator');

const getLeads = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, flowId } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (flowId) {
      filter.flowId = flowId;
    }

    const total = await LeadCapture.countDocuments(filter);
    const leads = await LeadCapture.find(filter)
      .populate('flowId', 'name triggerType')
      .populate('instagramAccountId', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    return sendSuccess(res, {
      leads,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get leads error:', error.message);
    next(error);
  }
};

const getLead = async (req, res, next) => {
  try {
    const { id } = req.params;

    const lead = await LeadCapture.findById(id)
      .populate('flowId')
      .populate('instagramAccountId');

    if (!lead) {
      return sendError(res, 'Lead not found', 404);
    }

    return sendSuccess(res, { lead });
  } catch (error) {
    console.error('Get lead error:', error.message);
    next(error);
  }
};

const deleteLead = async (req, res, next) => {
  try {
    const { id } = req.params;

    const lead = await LeadCapture.findByIdAndDelete(id);

    if (!lead) {
      return sendError(res, 'Lead not found', 404);
    }

    return sendSuccess(res, null, 'Lead deleted', 200);
  } catch (error) {
    console.error('Delete lead error:', error.message);
    next(error);
  }
};

module.exports = {
  getLeads,
  getLead,
  deleteLead,
};
