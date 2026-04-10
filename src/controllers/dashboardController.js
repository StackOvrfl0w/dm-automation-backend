const { sendSuccess, sendError } = require('../utils/response');
const AutomationFlow = require('../models/AutomationFlow');
const LeadCapture = require('../models/LeadCapture');
const WebhookEvent = require('../models/WebhookEvent');

const getDashboardStats = async (req, res, next) => {
  try {
    const userId = req.userId;

    const flows = await AutomationFlow.find({ userId });
    const totalFlows = flows.length;
    const activeFlows = flows.filter((f) => f.isActive).length;

    const leads = await LeadCapture.countDocuments({
      flowId: { $in: flows.map((f) => f._id) },
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const messagesSent = await WebhookEvent.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
      eventType: 'message_send',
    });

    const instagramAccounts = flows
      .flatMap((f) => f.instagramAccountId)
      .filter((id, index, arr) => arr.indexOf(id) === index).length;

    return sendSuccess(res, {
      stats: {
        totalFlows,
        activeFlows,
        inactiveFlows: totalFlows - activeFlows,
        totalLeads: leads,
        messagesSent,
        instagramAccountsConnected: instagramAccounts,
      },
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error.message);
    next(error);
  }
};

module.exports = {
  getDashboardStats,
};
