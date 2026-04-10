const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    instagramAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InstagramAccount',
      required: true,
    },
    recipientInstagramId: {
      type: String,
      required: true,
    },
    activeFlowId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AutomationFlow',
    },
    currentStepIndex: {
      type: Number,
      default: 0,
    },
    windowOpensAt: Date,
    windowClosesAt: Date,
    status: {
      type: String,
      enum: ['active', 'expired', 'completed'],
      default: 'active',
    },
  },
  { timestamps: false }
);

conversationSchema.index({ instagramAccountId: 1, recipientInstagramId: 1 }, { unique: true });

module.exports = mongoose.model('Conversation', conversationSchema);
