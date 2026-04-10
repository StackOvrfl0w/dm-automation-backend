const mongoose = require('mongoose');

const instagramAccountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    instagramUserId: {
      type: String,
      required: true,
      unique: true,
    },
    username: {
      type: String,
      required: true,
    },
    accessToken: {
      type: String,
      required: true,
    },
    tokenExpiresAt: {
      type: Date,
    },
    accountType: {
      type: String,
      enum: ['business', 'creator'],
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    connectedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('InstagramAccount', instagramAccountSchema);
