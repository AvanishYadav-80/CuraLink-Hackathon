import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FlaskConical, Plus, Trash2, PanelLeft, ChevronRight, Settings } from "lucide-react";
import useChatStore from "../store/chatStore";
import { useChat } from "../hooks/useChat";
import { getConversationHistory } from "../services/api";
import StructuredInputForm from "../components/StructuredInputForm";
import ChatMessage from "../components/ChatMessage";
import ResearchPanel from "../components/ResearchPanel";
import StreamingMessage from "../components/StreamingMessage";
import AIStatusBar from "../components/AIStatusBar";
import ThemeToggle from "../components/ThemeToggle";
import PlexusBackground from "../components/PlexusBackground";
import styles from "./ChatPage.module.css";

export default function ChatPage() {
  const { conversationId: urlConvId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [panelOpen, setPanelOpen] = useState(true);

  const store = useChatStore();
  const { sendMessage, messages, isStreaming, streamingStatus, currentStreamContent, publications, trials, stats } = useChat();

  // Smart Auto-scroll to bottom
  useEffect(() => {
    if (!messagesContainerRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    
    const { scrollHeight, scrollTop, clientHeight } = messagesContainerRef.current;
    // Auto-scroll if user is near the bottom (within 150px)
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
    
    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" }); // Using auto instead of smooth stops the "scroll fight"
    }
  }, [messages, currentStreamContent]);

  // Load conversation from URL param
  useEffect(() => {
    if (urlConvId && urlConvId !== store.conversationId) {
      getConversationHistory(urlConvId)
        .then((data) => {
          if (data.success) store.loadConversationHistory(data.conversation);
        })
        .catch(() => {});
    }
    store.fetchConversations();
  }, [urlConvId]);

  // Pre-fill from URL search params (coming from HomePage demo queries)
  const prefillDisease = searchParams.get("disease") || "";
  const prefillQuery = searchParams.get("query") || "";

  const handleNewChat = () => {
    store.resetConversation();
    navigate("/chat");
  };

  const handleHistorySelect = (convId) => {
    navigate(`/chat/${convId}`);
  };

  return (
    <div className={styles.layout}>
      <PlexusBackground />
      {/* ── Sidebar ── */}
      <AnimatePresence>
        {store.sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className={styles.sidebar}
          >
            {/* Logo */}
            <div className={styles.sidebarHeader}>
              <div 
                className={styles.sidebarLogo}
                onClick={() => navigate("/")}
                style={{ cursor: "pointer" }}
                title="Go to Home Page"
              >
                <div className={styles.logoIcon}><FlaskConical size={16} /></div>
                <span className={styles.logoText}>CuraLink</span>
              </div>
              <button className={styles.iconBtn} onClick={store.toggleSidebar} title="Collapse sidebar">
                <PanelLeft size={18} />
              </button>
            </div>

            {/* New Chat */}
            <button className={styles.newChatBtn} onClick={handleNewChat} id="new-chat-btn">
              <Plus size={16} />
              New Research
            </button>

            {/* Conversations */}
            <div className={styles.sidebarSection}>
              <span className={styles.sidebarSectionLabel}>Recent</span>
              <div className={styles.conversationList}>
                {store.conversations.length === 0 ? (
                  <p className={styles.emptyConvs}>No conversations yet</p>
                ) : (
                  store.conversations.map((conv) => (
                    <div
                      key={conv.conversationId}
                      className={`${styles.convItem} ${conv.conversationId === store.conversationId ? styles.convItemActive : ""}`}
                      onClick={() => handleHistorySelect(conv.conversationId)}
                      id={`conv-${conv.conversationId.slice(0, 8)}`}
                    >
                      <div className={styles.convTitle}>{conv.title}</div>
                      <div className={styles.convMeta}>
                        {conv.userContext?.disease && (
                          <span className={styles.convDisease}>{conv.userContext.disease}</span>
                        )}
                      </div>
                      <button
                        className={styles.convDelete}
                        onClick={(e) => { e.stopPropagation(); store.removeConversation(conv.conversationId); }}
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Footer */}
            <div className={styles.sidebarFooter}>
              <div className={styles.sidebarFooterBadge}>
                <span className={styles.onlineDot} />
                <span>AI Engine Online</span>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Main ── */}
      <main className={styles.main}>
        {/* Top Bar */}
        <div className={styles.topBar}>
          {!store.sidebarOpen && (
            <button className={styles.iconBtn} onClick={store.toggleSidebar}>
              <PanelLeft size={18} />
            </button>
          )}
          <div className={styles.topBarCenter}>
            {store.userContext?.disease && (
              <div className={styles.contextPill}>
                <span className={styles.contextLabel}>Disease:</span>
                <span className={styles.contextValue}>{store.userContext.disease}</span>
                {store.userContext?.location && (
                  <>
                    <ChevronRight size={12} />
                    <span className={styles.contextValue}>{store.userContext.location}</span>
                  </>
                )}
              </div>
            )}
            <ThemeToggle />
          </div>
          <button
            className={`${styles.iconBtn} ${styles.panelToggleBtn}`}
            onClick={() => setPanelOpen(!panelOpen)}
            title="Toggle research panel"
          >
            <Settings size={18} />
            <span>Research Panel</span>
          </button>
        </div>

        {/* Messages Area */}
        <div className={styles.messagesArea} ref={messagesContainerRef}>
          {messages.length === 0 && !isStreaming ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🔬</div>
              <h2 className={styles.emptyTitle}>Start your research</h2>
              <p className={styles.emptySubtitle}>
                Enter a disease and your query below. CuraLink will fetch and synthesize
                research from PubMed, OpenAlex, and ClinicalTrials.gov.
              </p>
            </div>
          ) : (
            <>
              <AnimatePresence>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    <ChatMessage message={msg} />
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Streaming message */}
              {isStreaming && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                  <StreamingMessage content={currentStreamContent} status={streamingStatus} />
                </motion.div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Status bar */}
        {isStreaming && streamingStatus && <AIStatusBar status={streamingStatus} stats={stats} />}

        {/* Input Form */}
        <div className={styles.inputArea}>
          <StructuredInputForm
            onSubmit={sendMessage}
            isLoading={isStreaming}
            prefillDisease={prefillDisease}
            prefillQuery={prefillQuery}
          />
        </div>
      </main>

      {/* ── Research Panel ── */}
      <AnimatePresence>
        {panelOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 380, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className={styles.researchPanel}
          >
            <ResearchPanel publications={publications} trials={trials} stats={stats} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
