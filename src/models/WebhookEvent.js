const mongoose = require('mongoose');

const webhookEventSchema = new mongoose.Schema(
  {
    instagramAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InstagramAccount',
    },
    eventType: {
      type: String,
      required: true,
    },
    rawPayload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    processed: {
      type: Boolean,
      default: false,
    },
    processedAt: Date,
    error: String,
  },
  { timestamps: true }
);

webhookEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

module.exports = mongoose.model('WebhookEvent', webhookEventSchema);
