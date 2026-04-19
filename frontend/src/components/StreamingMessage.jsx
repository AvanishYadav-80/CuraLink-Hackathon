import ReactMarkdown from "react-markdown";
import { Bot } from "lucide-react";
import styles from "./StreamingMessage.module.css";

export default function StreamingMessage({ content, status }) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.avatar}>
        <Bot size={16} />
      </div>
      <div className={styles.content}>
        {status && !content && (
          <div className={styles.statusBar}>
            <div className={styles.typingDots}>
              <span /><span /><span />
            </div>
            <span className={styles.statusText}>{status}</span>
          </div>
        )}
        {content && (
          <div className={styles.markdownWrapper}>
            <ReactMarkdown>{content}</ReactMarkdown>
            <span className={styles.cursor} />
          </div>
        )}
      </div>
    </div>
  );
}
