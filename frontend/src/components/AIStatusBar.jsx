import { Cpu, Database, Zap, BarChart3 } from "lucide-react";
import styles from "./AIStatusBar.module.css";

export default function AIStatusBar({ status, stats }) {
  return (
    <div className={styles.bar}>
      <div className={styles.left}>
        <div className={styles.aiDot} />
        <Cpu size={13} />
        <span className={styles.statusText}>{status || "Processing..."}</span>
      </div>
      {stats && (
        <div className={styles.right}>
          <div className={styles.statChip}>
            <Database size={11} />
            <span>{(stats.total_publications_fetched || 0)} papers</span>
          </div>
          <div className={styles.statChip}>
            <BarChart3 size={11} />
            <span>{stats.pubmed_count || 0} PubMed · {stats.openalex_count || 0} OpenAlex</span>
          </div>
          <div className={styles.statChip}>
            <Zap size={11} />
            <span>{stats.trials_count || 0} trials</span>
          </div>
        </div>
      )}
    </div>
  );
}
