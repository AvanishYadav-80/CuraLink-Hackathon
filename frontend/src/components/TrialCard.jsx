import { motion } from "framer-motion";
import { MapPin, Phone, Mail, ExternalLink, Clock, Users, Beaker } from "lucide-react";
import styles from "./TrialCard.module.css";

const STATUS_CONFIG = {
  RECRUITING: { label: "Recruiting", class: "badge-recruiting", dot: "#22d3a5" },
  COMPLETED: { label: "Completed", class: "badge-completed", dot: "#64748b" },
  ACTIVE_NOT_RECRUITING: { label: "Active", class: "badge-active", dot: "#f59e0b" },
  ENROLLING_BY_INVITATION: { label: "By Invitation", class: "badge-active", dot: "#f59e0b" },
  TERMINATED: { label: "Terminated", class: "badge-completed", dot: "#64748b" },
};

export default function TrialCard({ trial, index = 0 }) {
  const {
    title, status, phase, summary, eligibility,
    locations, contacts, url, enrollment, start_date, relevance_score,
  } = trial;

  const statusCfg = STATUS_CONFIG[status] || { label: status, class: "badge-completed", dot: "#64748b" };
  const scorePercent = Math.round((relevance_score || 0) * 100);

  const truncatedSummary = summary
    ? summary.length > 200 ? summary.slice(0, 200) + "…" : summary
    : "";

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08 }}
      className={styles.card}
    >
      {/* Header row */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={`badge ${statusCfg.class}`}>
            <span className={styles.statusDot} style={{ background: statusCfg.dot }} />
            {statusCfg.label}
          </span>
          {phase && phase !== "N/A" && (
            <span className={styles.phaseBadge}>
              <Beaker size={10} />
              {phase}
            </span>
          )}
        </div>
        {scorePercent > 0 && (
          <span className={styles.score}>{scorePercent}% match</span>
        )}
      </div>

      {/* Title */}
      <h3 className={styles.title}>{title}</h3>

      {/* Summary */}
      {truncatedSummary && (
        <p className={styles.summary}>{truncatedSummary}</p>
      )}

      {/* Meta grid */}
      <div className={styles.metaGrid}>
        {locations && locations[0] && locations[0] !== "Location not specified" && (
          <div className={styles.metaItem}>
            <MapPin size={12} />
            <span>{locations.slice(0, 2).join(" · ")}</span>
          </div>
        )}
        {enrollment && enrollment !== "N/A" && (
          <div className={styles.metaItem}>
            <Users size={12} />
            <span>{enrollment} participants</span>
          </div>
        )}
        {start_date && start_date !== "N/A" && (
          <div className={styles.metaItem}>
            <Clock size={12} />
            <span>Started {start_date}</span>
          </div>
        )}
      </div>

      {/* Contacts */}
      {contacts && contacts.length > 0 && (
        <div className={styles.contacts}>
          <span className={styles.contactsLabel}>Contact:</span>
          <span className={styles.contactInfo}>{contacts[0]}</span>
        </div>
      )}

      {/* View link */}
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.viewBtn}
          id={`trial-link-${index}`}
        >
          View on ClinicalTrials.gov
          <ExternalLink size={11} />
        </a>
      )}
    </motion.div>
  );
}
