const mongoose = require('mongoose');

const stepSchema = new mongoose.Schema({
  stepType: {
    type: String,
    enum: ['send_message', 'collect_field', 'delay', 'conditional'],
    required: true,
  },
  content: String,
  delay: Number,
  fieldType: {
    type: String,
    enum: ['name', 'email', 'phone'],
  },
  condition: String,
});

const automationFlowSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    instagramAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InstagramAccount',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    triggerType: {
      type: String,
      enum: ['keyword_dm', 'story_reply', 'comment_keyword', 'lead_capture', 'ai_reply'],
      required: true,
    },
    triggerConfig: {
      keyword: String,
      matchType: {
        type: String,
        enum: ['exact', 'contains'],
        default: 'contains',
      },
      aiSystemPrompt: String,
      aiModel: {
        type: String,
        default: 'gpt-4o-mini',
      },
    },
    steps: [stepSchema],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AutomationFlow', automationFlowSchema);
