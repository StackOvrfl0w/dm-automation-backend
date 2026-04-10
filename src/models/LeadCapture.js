const mongoose = require('mongoose');

const leadCaptureSchema = new mongoose.Schema(
  {
    flowId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AutomationFlow',
      required: true,
    },
    instagramAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InstagramAccount',
      required: true,
    },
    recipientInstagramId: {
      type: String,
      required: true,
    },
    recipientUsername: String,
    collectedData: {
      name: String,
      email: String,
      phone: String,
    },
    completedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('LeadCapture', leadCaptureSchema);
