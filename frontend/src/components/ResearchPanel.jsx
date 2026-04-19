import { BookOpen, FlaskConical, Database, ChevronRight } from "lucide-react";
import PublicationCard from "./PublicationCard";
import TrialCard from "./TrialCard";
import styles from "./ResearchPanel.module.css";

export default function ResearchPanel({ publications = [], trials = [], stats = null }) {
  const hasData = publications.length > 0 || trials.length > 0;

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <Database size={16} />
          <span>Research Panel</span>
        </div>
        {stats && (
          <div className={styles.statsRow}>
            <span className={styles.statBadge}>{stats.total_publications_fetched || 0} fetched</span>
            <ChevronRight size={12} />
            <span className={styles.statBadge} style={{ color: "var(--color-accent)" }}>
              {publications.length + trials.length} top results
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className={styles.body}>
        {!hasData ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>📊</div>
            <p>Research results will appear here after your first query</p>
          </div>
        ) : (
          <>
            {/* Publications */}
            {publications.length > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <BookOpen size={14} />
                  <span>Publications ({publications.length})</span>
                </div>
                <div className={styles.sectionContent}>
                  {publications.map((pub, i) => (
                    <PublicationCard key={pub.id || i} publication={pub} index={i} />
                  ))}
                </div>
              </div>
            )}

            {/* Trials */}
            {trials.length > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <FlaskConical size={14} />
                  <span>Clinical Trials ({trials.length})</span>
                </div>
                <div className={styles.sectionContent}>
                  {trials.map((trial, i) => (
                    <TrialCard key={trial.id || i} trial={trial} index={i} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
