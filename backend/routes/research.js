const express = require("express");
const router = express.Router();
const axios = require("axios");

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || "http://localhost:8000";

/**
 * POST /api/research/fetch
 * Fetch research without LLM (for initial page load or card-only view)
 */
router.post("/fetch", async (req, res) => {
  try {
    const { disease, query, location } = req.body;

    if (!disease) {
      return res.status(400).json({ error: "disease is required" });
    }

    const response = await axios.post(
      `${AI_ENGINE_URL}/api/research`,
      { disease, query: query || disease, location: location || "" },
      { timeout: 60000 }
    );

    res.json(response.data);
  } catch (error) {
    const message =
      error.code === "ECONNREFUSED"
        ? "AI engine is not running"
        : error.response?.data?.detail || error.message;
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/research/health
 * Check AI engine health
 */
router.get("/health", async (req, res) => {
  try {
    const response = await axios.get(`${AI_ENGINE_URL}/health`, { timeout: 5000 });
    res.json({ aiEngine: "online", ...response.data });
  } catch (error) {
    res.json({ aiEngine: "offline", error: error.message });
  }
});

module.exports = router;
