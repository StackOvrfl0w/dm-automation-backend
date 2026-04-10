const Conversation = require('../models/Conversation');
const AutomationFlow = require('../models/AutomationFlow');
const LeadCapture = require('../models/LeadCapture');
const MetaApiService = require('./MetaApiService');
const AiReplyService = require('./AiReplyService');
const { decrypt } = require('../utils/encryption');

const MAX_DMS_PER_HOUR = 200;

const executeFlow = async (jobData) => {
  const {
    conversationId,
    flowId,
    instagramAccountId,
    recipientInstagramId,
    accountAccessToken,
  } = jobData;

  try {
    const conversation = await Conversation.findById(conversationId);
    const flow = await AutomationFlow.findById(flowId);

    if (!conversation || !flow) {
      throw new Error('Conversation or flow not found');
    }

    if (new Date() > conversation.windowClosesAt) {
      conversation.status = 'expired';
      await conversation.save();
      return { status: 'expired' };
    }

    const step = flow.steps[conversation.currentStepIndex];

    if (!step) {
      conversation.status = 'completed';
      await conversation.save();
      return { status: 'completed' };
    }

    const decryptedToken = decrypt(accountAccessToken);

    if (step.stepType === 'send_message') {
      await MetaApiService.sendDirectMessage(
        decryptedToken,
        recipientInstagramId,
        step.content
      );
    } else if (step.stepType === 'collect_field') {
      let leadCapture = await LeadCapture.findOne({
        flowId,
        recipientInstagramId,
      });

      if (!leadCapture) {
        leadCapture = new LeadCapture({
          flowId,
          instagramAccountId,
          recipientInstagramId,
          collectedData: {},
        });
      }

      if (step.fieldType) {
        leadCapture.collectedData[step.fieldType] = null;
      }

      await leadCapture.save();

      await MetaApiService.sendDirectMessage(
        decryptedToken,
        recipientInstagramId,
        step.content || `Please provide your ${step.fieldType}`
      );
    } else if (step.stepType === 'delay') {
      await new Promise((resolve) => setTimeout(resolve, step.delay || 1000));
    } else if (step.stepType === 'conditional') {
      console.log('Conditional step placeholder');
    }

    if (conversation.currentStepIndex < flow.steps.length - 1) {
      conversation.currentStepIndex += 1;
      await conversation.save();
    } else {
      conversation.status = 'completed';
      await conversation.save();
    }

    return { status: 'success', nextStep: conversation.currentStepIndex };
  } catch (error) {
    console.error('Flow execution error:', error.message);
    throw error;
  }
};

const handleAiReplyFlow = async (jobData) => {
  const {
    conversationId,
    flowId,
    recipientInstagramId,
    accountAccessToken,
    messageText,
  } = jobData;

  try {
    const flow = await AutomationFlow.findById(flowId);

    if (!flow) {
      throw new Error('Flow not found');
    }

    const systemPrompt = flow.triggerConfig.aiSystemPrompt || 'You are a helpful assistant.';

    const reply = await AiReplyService.generateAiReply(messageText, systemPrompt);

    const decryptedToken = decrypt(accountAccessToken);

    await MetaApiService.sendDirectMessage(
      decryptedToken,
      recipientInstagramId,
      reply
    );

    return { status: 'success', reply };
  } catch (error) {
    console.error('AI reply flow error:', error.message);
    throw error;
  }
};

module.exports = {
  executeFlow,
  handleAiReplyFlow,
  MAX_DMS_PER_HOUR,
};
