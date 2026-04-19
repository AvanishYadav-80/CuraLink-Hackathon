const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const chatRoutes = require("./routes/chat");
const researchRoutes = require("./routes/research");
const { errorHandler } = require("./middleware/errorHandler");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === "production"
    ? ["https://curalink.vercel.app", /\.vercel\.app$/]
    : ["http://localhost:5173", "http://localhost:3000"],
  credentials: true,
}));
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "CuraLink API Gateway", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api/chat", chatRoutes);
app.use("/api/research", researchRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 CuraLink backend running on http://localhost:${PORT}`);
  console.log(`🤖 AI Engine expected at: ${process.env.AI_ENGINE_URL}`);
});

module.exports = app;
