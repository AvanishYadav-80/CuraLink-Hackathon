const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ["user", "assistant"],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  publications: [
    {
      id: String,
      title: String,
      authors: [String],
      year: String,
      journal: String,
      abstract: String,
      source: String,
      url: String,
      doi: String,
      relevance_score: Number,
    },
  ],
  trials: [
    {
      id: String,
      title: String,
      status: String,
      phase: String,
      summary: String,
      eligibility: String,
      locations: [String],
      contacts: [String],
      url: String,
      relevance_score: Number,
    },
  ],
  stats: {
    total_publications_fetched: Number,
    pubmed_count: Number,
    openalex_count: Number,
    trials_count: Number,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const ConversationSchema = new mongoose.Schema(
  {
    conversationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      default: "New Conversation",
    },
    userContext: {
      disease: String,
      query: String,
      location: String,
      patientName: String,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    messages: [MessageSchema],
  },
  {
    timestamps: true,
  }
);

// Auto-generate title from first user message
ConversationSchema.methods.generateTitle = function () {
  const firstUserMsg = this.messages.find((m) => m.role === "user");
  if (firstUserMsg) {
    const content = firstUserMsg.content;
    this.title = content.length > 60 ? content.substring(0, 60) + "..." : content;
  }
};

module.exports = mongoose.model("Conversation", ConversationSchema);
