import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import useChatStore from "../store/chatStore";
import { streamChat } from "../services/api";

// Inline uuid v4 fallback if not installed
const generateId = () => {
  return "xxxx-xxxx-4xxx-yxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export function useChat() {
  const navigate = useNavigate();
  const store = useChatStore();

  const sendMessage = useCallback(
    async ({ disease, query, location, patientName }) => {
      if (!disease || !query) return;

      // Update user context
      store.setUserContext({ disease, query, location, patientName });

      // Manage conversation ID
      let convId = store.conversationId;
      if (!convId) {
        convId = generateId();
        store.setConversationId(convId);
        navigate(`/chat/${convId}`, { replace: true });
      }

      // Add user message to UI immediately
      const userContent = `Disease: ${disease}\nQuery: ${query}${location ? `\nLocation: ${location}` : ""}`;
      store.addUserMessage(userContent);
      store.startStreaming();

      // Build conversation history from existing messages
      const history = store.messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      await streamChat(
        {
          conversationId: convId,
          disease,
          query,
          location: location || "",
          patientName: patientName || "",
        },
        {
          onStatus: (msg) => store.updateStreamStatus(msg),
          onToken: (token) => store.appendStreamToken(token),
          onResearchData: (data) => {
            store.setResearchData(data.publications, data.trials);
          },
          onStats: (stats) => store.setStats(stats),
          onDone: () => {
            const { publications, trials, stats } = store;
            store.finalizeAssistantMessage(publications, trials, stats);
            store.fetchConversations();
          },
          onError: (err) => {
            store.setStreamError(err);
          },
        }
      );
    },
    [store, navigate]
  );

  return {
    sendMessage,
    messages: store.messages,
    isStreaming: store.isStreaming,
    streamingStatus: store.streamingStatus,
    currentStreamContent: store.currentStreamContent,
    publications: store.publications,
    trials: store.trials,
    stats: store.stats,
    conversationId: store.conversationId,
    resetConversation: store.resetConversation,
  };
}
