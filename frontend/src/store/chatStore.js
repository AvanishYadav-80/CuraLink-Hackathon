import { create } from "zustand";
import { listConversations, deleteConversation } from "../services/api";

const useChatStore = create((set, get) => ({
  // Current active conversation
  conversationId: null,
  messages: [],
  userContext: { disease: "", query: "", location: "", patientName: "" },

  // UI state
  isStreaming: false,
  streamingStatus: "",
  currentStreamContent: "",

  // Research panel
  publications: [],
  trials: [],
  stats: null,

  // Sidebar conversations
  conversations: [],
  sidebarOpen: true,

  // Actions
  setConversationId: (id) => set({ conversationId: id }),

  setUserContext: (ctx) =>
    set((state) => ({ userContext: { ...state.userContext, ...ctx } })),

  addUserMessage: (content) =>
    set((state) => ({
      messages: [
        ...state.messages,
        { role: "user", content, timestamp: new Date().toISOString(), id: Date.now() },
      ],
    })),

  startStreaming: () =>
    set({ isStreaming: true, currentStreamContent: "", streamingStatus: "" }),

  updateStreamStatus: (status) => set({ streamingStatus: status }),

  appendStreamToken: (token) =>
    set((state) => ({
      currentStreamContent: state.currentStreamContent + token,
    })),

  finalizeAssistantMessage: (publications, trials, stats) =>
    set((state) => ({
      isStreaming: false,
      streamingStatus: "",
      messages: [
        ...state.messages,
        {
          role: "assistant",
          content: state.currentStreamContent,
          publications: publications || state.publications,
          trials: trials || state.trials,
          stats,
          timestamp: new Date().toISOString(),
          id: Date.now(),
        },
      ],
      currentStreamContent: "",
      publications: publications && publications.length > 0 ? publications : state.publications,
      trials: trials && trials.length > 0 ? trials : state.trials,
      stats: stats || state.stats,
    })),

  setResearchData: (publications, trials) =>
    set({ publications: publications || [], trials: trials || [] }),

  setStats: (stats) => set({ stats }),

  setStreamError: (error) =>
    set((state) => ({
      isStreaming: false,
      streamingStatus: "",
      messages: [
        ...state.messages,
        {
          role: "error",
          content: error,
          timestamp: new Date().toISOString(),
          id: Date.now(),
        },
      ],
      currentStreamContent: "",
    })),

  resetConversation: () =>
    set({
      conversationId: null,
      messages: [],
      publications: [],
      trials: [],
      stats: null,
      isStreaming: false,
      currentStreamContent: "",
      streamingStatus: "",
    }),

  loadConversationHistory: (conversation) => {
    const { messages, userContext, conversationId } = conversation;
    const lastMsg = messages?.[messages.length - 1];
    set({
      conversationId,
      userContext: {
        disease: userContext?.disease || "",
        query: userContext?.query || "",
        location: userContext?.location || "",
        patientName: userContext?.patientName || "",
      },
      messages: messages?.map((m) => ({ ...m, id: m._id || Date.now() })) || [],
      publications: lastMsg?.publications || [],
      trials: lastMsg?.trials || [],
      stats: lastMsg?.stats || null,
    });
  },

  fetchConversations: async () => {
    try {
      const data = await listConversations();
      set({ conversations: data.conversations || [] });
    } catch {
      set({ conversations: [] });
    }
  },

  removeConversation: async (id) => {
    try {
      await deleteConversation(id);
      set((state) => ({
        conversations: state.conversations.filter((c) => c.conversationId !== id),
      }));
    } catch {/* ignore */}
  },

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));

export default useChatStore;
