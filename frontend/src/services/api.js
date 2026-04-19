import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

// ─────────────────────────────────────────────
// Chat endpoints
// ─────────────────────────────────────────────

export const createConversation = (data) =>
  api.post("/chat/new", data).then((r) => r.data);

export const getConversationHistory = (id) =>
  api.get(`/chat/history/${id}`).then((r) => r.data);

export const listConversations = () =>
  api.get("/chat/conversations").then((r) => r.data);

export const deleteConversation = (id) =>
  api.delete(`/chat/${id}`).then((r) => r.data);

// ─────────────────────────────────────────────
// Research endpoints  
// ─────────────────────────────────────────────

export const fetchResearch = (data) =>
  api.post("/research/fetch", data).then((r) => r.data);

export const checkAIEngineHealth = () =>
  api.get("/research/health").then((r) => r.data);

// ─────────────────────────────────────────────
// SSE Streaming chat (returns EventSource-like object via fetch)
// ─────────────────────────────────────────────

export const streamChat = async (payload, callbacks = {}) => {
  const { onStatus, onToken, onResearchData, onStats, onDone, onError } = callbacks;

  try {
    const response = await fetch(`${API_BASE}/chat/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No reader available");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.replace("data: ", "").trim();
        if (!jsonStr) continue;

        try {
          const event = JSON.parse(jsonStr);

          switch (event.type) {
            case "status":
              onStatus?.(event.message);
              break;
            case "token":
              onToken?.(event.content);
              break;
            case "research_data":
              onResearchData?.(event.publications, event.trials);
              break;
            case "stats":
              onStats?.(event.data);
              break;
            case "done":
              onDone?.();
              break;
            case "error":
              onError?.(event.message);
              break;
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }
  } catch (err) {
    onError?.(err.message || "Stream error occurred");
  }
};

export default api;
