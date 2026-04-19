const express = require("express");
const router = express.Router();
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const Conversation = require("../models/Conversation");

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || "http://localhost:8000";

/**
 * POST /api/chat/new
 * Create a new conversation session
 */
router.post("/new", async (req, res) => {
  try {
    const { disease, query, location, patientName } = req.body;
    const userId = req.headers["x-user-id"];

    if (!userId) {
      return res.status(401).json({ error: "User identity required" });
    }

    const conversationId = uuidv4();

    const conversation = new Conversation({
      conversationId,
      userId,
      title: `${disease || "Medical Research"} — ${query || "Research Query"}`.substring(0, 80),
      userContext: { disease, query, location, patientName },
      messages: [],
    });

    await conversation.save();

    res.json({
      success: true,
      conversationId,
      message: "New conversation created",
    });
  } catch (error) {
    console.error("[Chat] /new error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/chat/query
 * Main chat endpoint — proxies to AI engine with SSE streaming back to client
 */
router.post("/query", async (req, res) => {
  const { conversationId, disease, query, location, patientName } = req.body;
  const userId = req.headers["x-user-id"];

  if (!userId) {
    return res.status(401).json({ error: "User identity required" });
  }

  if (!disease || !query) {
    return res.status(400).json({ error: "disease and query are required" });
  }

  // Load conversation history
  let conversation = null;
  let history = [];

  try {
    if (conversationId) {
      conversation = await Conversation.findOne({ conversationId, userId });
      if (conversation) {
        history = conversation.messages.slice(-6).map((m) => ({
          role: m.role,
          content: m.content,
        }));
      }
    }

    // Create conversation if it doesn't exist
    if (!conversation) {
      const newId = conversationId || uuidv4();
      conversation = new Conversation({
        conversationId: newId,
        userId,
        title: `${disease} — ${query}`.substring(0, 80),
        userContext: { disease, query, location, patientName },
        messages: [],
      });
    }
  } catch (dbErr) {
    console.error("[Chat] DB load error:", dbErr.message);
  }

  // Save user message
  try {
    conversation.messages.push({
      role: "user",
      content: `Disease: ${disease}\nQuery: ${query}${location ? `\nLocation: ${location}` : ""}`,
      timestamp: new Date(),
    });
    await conversation.save();
  } catch (saveErr) {
    console.error("[Chat] Save user msg error:", saveErr.message);
  }

  // Set up SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  // Prepare AI engine request
  const aiPayload = {
    disease,
    query,
    location: location || "",
    patient_name: patientName || "",
    conversation_history: history,
  };

  let assistantContent = "";
  let researchData = null;
  let statsData = null;

  try {
    // Stream from AI engine
    const aiResponse = await axios({
      method: "POST",
      url: `${AI_ENGINE_URL}/api/chat/stream`,
      data: aiPayload,
      responseType: "stream",
      timeout: 120000, // 2 min timeout for LLM
    });

    // Pipe AI engine SSE events to client with buffering to handle fragmentation
    let buffer = "";
    aiResponse.data.on("data", (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep the last (potentially partial) line in buffer

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        
        try {
          const jsonStr = line.replace("data: ", "").trim();
          if (!jsonStr) continue;
          
          const event = JSON.parse(jsonStr);

          // Forward to client
          res.write(`data: ${JSON.stringify(event)}\n\n`);

          // Collect assistant content and research data for DB storage
          if (event.type === "token") {
            assistantContent += event.content;
          } else if (event.type === "research_data") {
            researchData = event;
          } else if (event.type === "stats") {
            statsData = event.data;
          }
        } catch (parseErr) {
          // Skip malformed chunks
        }
      }
    });

    aiResponse.data.on("end", async () => {
      try {
        // Save assistant message to DB
        if (assistantContent && conversation) {
          const assistantMsg = {
            role: "assistant",
            content: assistantContent,
            timestamp: new Date(),
          };

          if (researchData) {
            assistantMsg.publications = (researchData.publications || []).slice(0, 8);
            assistantMsg.trials = (researchData.trials || []).slice(0, 5);
          }
          if (statsData) {
            assistantMsg.stats = statsData;
          }

          conversation.messages.push(assistantMsg);
          await conversation.save();
        }
      } catch (saveErr) {
        console.error("[Chat] Save assistant msg error:", saveErr.message);
      }

      res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
      res.end();
    });

    aiResponse.data.on("error", (err) => {
      console.error("[Chat] AI stream error:", err.message);
      res.write(
        `data: ${JSON.stringify({ type: "error", message: "AI engine stream error: " + err.message })}\n\n`
      );
      res.end();
    });
  } catch (err) {
    console.error("[Chat] AI engine error:", err.message);
    const errorMsg =
      err.code === "ECONNREFUSED"
        ? "AI engine is not running. Please start the Python backend."
        : err.message;
    res.write(`data: ${JSON.stringify({ type: "error", message: errorMsg })}\n\n`);
    res.end();
  }
});

/**
 * GET /api/chat/history/:conversationId
 * Retrieve conversation history
 */
router.get("/history/:conversationId", async (req, res) => {
  const userId = req.headers["x-user-id"];
  try {
    const conversation = await Conversation.findOne({
      conversationId: req.params.conversationId,
      userId,
    });

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    res.json({
      success: true,
      conversation: {
        conversationId: conversation.conversationId,
        title: conversation.title,
        userContext: conversation.userContext,
        messages: conversation.messages,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/chat/conversations
 * List all conversations (for sidebar)
 */
router.get("/conversations", async (req, res) => {
  const userId = req.headers["x-user-id"];
  if (!userId) return res.json({ success: true, conversations: [] });

  try {
    const conversations = await Conversation.find({ userId })
      .select("conversationId title userContext createdAt updatedAt")
      .sort({ updatedAt: -1 })
      .limit(20);

    res.json({ success: true, conversations });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/chat/:conversationId
 * Delete a conversation
 */
router.delete("/:conversationId", async (req, res) => {
  const userId = req.headers["x-user-id"];
  try {
    await Conversation.deleteOne({ conversationId: req.params.conversationId, userId });
    res.json({ success: true, message: "Conversation deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
