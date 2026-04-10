const { validationResult } = require('express-validator');
const AutomationFlow = require('../models/AutomationFlow');
const { sendSuccess, sendError } = require('../utils/response');

const getFlows = async (req, res, next) => {
  try {
    const flows = await AutomationFlow.find({ userId: req.userId }).populate(
      'instagramAccountId',
      'username'
    );

    return sendSuccess(res, flows, 'Flows retrieved', 200);
  } catch (error) {
    next(error);
  }
};

const createFlow = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const { name, instagramAccountId, triggerType, triggerConfig, steps } = req.body;

    const flow = new AutomationFlow({
      userId: req.userId,
      name,
      instagramAccountId,
      triggerType,
      triggerConfig,
      steps,
    });

    await flow.save();

    return sendSuccess(res, flow, 'Flow created', 201);
  } catch (error) {
    next(error);
  }
};

const getFlow = async (req, res, next) => {
  try {
    const flow = await AutomationFlow.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!flow) {
      return sendError(res, 'Flow not found', 404);
    }

    return sendSuccess(res, flow, 'Flow retrieved', 200);
  } catch (error) {
    next(error);
  }
};

const updateFlow = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const flow = await AutomationFlow.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!flow) {
      return sendError(res, 'Flow not found', 404);
    }

    return sendSuccess(res, flow, 'Flow updated', 200);
  } catch (error) {
    next(error);
  }
};

const deleteFlow = async (req, res, next) => {
  try {
    const flow = await AutomationFlow.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!flow) {
      return sendError(res, 'Flow not found', 404);
    }

    return sendSuccess(res, null, 'Flow deleted', 200);
  } catch (error) {
    next(error);
  }
};

const toggleFlow = async (req, res, next) => {
  try {
    const flow = await AutomationFlow.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!flow) {
      return sendError(res, 'Flow not found', 404);
    }

    flow.isActive = !flow.isActive;
    await flow.save();

    return sendSuccess(res, flow, `Flow ${flow.isActive ? 'activated' : 'deactivated'}`, 200);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFlows,
  createFlow,
  getFlow,
  updateFlow,
  deleteFlow,
  toggleFlow,
};
