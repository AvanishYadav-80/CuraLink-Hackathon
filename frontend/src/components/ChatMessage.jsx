import ReactMarkdown from "react-markdown";
import { User, Bot, ExternalLink, AlertCircle } from "lucide-react";
import PublicationCard from "./PublicationCard";
import TrialCard from "./TrialCard";
import styles from "./ChatMessage.module.css";

function UserMessage({ content }) {
  return (
    <div className={styles.userMessage}>
      <div className={styles.userAvatar}>
        <User size={16} />
      </div>
      <div className={styles.userBubble}>
        {content.split("\n").map((line, i) => {
          if (!line.trim()) return null;
          const [label, ...rest] = line.split(": ");
          return (
            <p key={i} className={styles.userLine}>
              {rest.length > 0 ? (
                <>
                  <span className={styles.userLabel}>{label}:</span>{" "}
                  <span>{rest.join(": ")}</span>
                </>
              ) : (
                line
              )}
            </p>
          );
        })}
      </div>
    </div>
  );
}

function AssistantMessage({ message }) {
  const { content, publications, trials } = message;

  return (
    <div className={styles.assistantMessage}>
      <div className={styles.assistantAvatar}>
        <Bot size={16} />
      </div>
      <div className={styles.assistantContent}>
        {/* Main AI response */}
        <div className={styles.markdownContent}>
          <ReactMarkdown
            components={{
              h2: ({ children }) => <h2 className={styles.mdH2}>{children}</h2>,
              h3: ({ children }) => <h3 className={styles.mdH3}>{children}</h3>,
              p: ({ children }) => <p className={styles.mdP}>{children}</p>,
              strong: ({ children }) => <strong className={styles.mdStrong}>{children}</strong>,
              ul: ({ children }) => <ul className={styles.mdUl}>{children}</ul>,
              li: ({ children }) => <li className={styles.mdLi}>{children}</li>,
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer" className={styles.mdLink}>
                  {children} <ExternalLink size={10} style={{ display: "inline" }} />
                </a>
              ),
              blockquote: ({ children }) => <blockquote className={styles.mdBlockquote}>{children}</blockquote>,
              code: ({ children }) => <code className={styles.mdCode}>{children}</code>,
            }}
          >
            {content}
          </ReactMarkdown>
        </div>

        {/* Publication cards */}
        {publications && publications.length > 0 && (
          <div className={styles.resultsSection}>
            <h4 className={styles.resultsSectionTitle}>
              📚 Research Publications ({publications.length})
            </h4>
            <div className={styles.publicationsGrid}>
              {publications.slice(0, 8).map((pub, i) => (
                <PublicationCard key={pub.id || i} publication={pub} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* Trial cards */}
        {trials && trials.length > 0 && (
          <div className={styles.resultsSection}>
            <h4 className={styles.resultsSectionTitle}>
              🧪 Clinical Trials ({trials.length})
            </h4>
            <div className={styles.trialsGrid}>
              {trials.slice(0, 5).map((trial, i) => (
                <TrialCard key={trial.id || i} trial={trial} index={i} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ErrorMessage({ content }) {
  return (
    <div className={styles.errorMessage}>
      <AlertCircle size={16} />
      <span>{content}</span>
    </div>
  );
}

export default function ChatMessage({ message }) {
  const { role } = message;
  if (role === "user") return <UserMessage content={message.content} />;
  if (role === "assistant") return <AssistantMessage message={message} />;
  if (role === "error") return <ErrorMessage content={message.content} />;
  return null;
}
