import { motion } from "framer-motion";
import { ExternalLink, BookOpen, Calendar, Users, Star } from "lucide-react";
import styles from "./PublicationCard.module.css";

export default function PublicationCard({ publication, index = 0 }) {
  const { title, authors, year, abstract, source, url, journal, relevance_score } = publication;

  const scorePercent = Math.round((relevance_score || 0) * 100);
  const sourceBadge = source === "PubMed" ? "badge-pubmed" : "badge-openalex";

  const truncatedAbstract = abstract
    ? abstract.length > 180 ? abstract.slice(0, 180) + "…" : abstract
    : "No abstract available.";

  const authorsList = Array.isArray(authors)
    ? authors.slice(0, 3).join(", ") + (authors.length > 3 ? " et al." : "")
    : authors || "Unknown Author";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className={styles.card}
    >
      {/* Header */}
      <div className={styles.header}>
        <span className={`badge ${sourceBadge}`}>{source}</span>
        {scorePercent > 0 && (
          <div className={styles.scoreChip}>
            <Star size={10} />
            <span>{scorePercent}%</span>
          </div>
        )}
      </div>

      {/* Title */}
      <h3 className={styles.title}>{title}</h3>

      {/* Abstract */}
      <p className={styles.abstract}>{truncatedAbstract}</p>

      {/* Meta */}
      <div className={styles.meta}>
        <div className={styles.metaRow}>
          <Users size={12} />
          <span>{authorsList}</span>
        </div>
        <div className={styles.metaRow}>
          <Calendar size={12} />
          <span>{year}</span>
          {journal && journal !== "OpenAlex" && journal !== "Unknown Journal" && (
            <>
              <span className={styles.metaDot}>·</span>
              <span className={styles.journal}>{journal.slice(0, 40)}</span>
            </>
          )}
        </div>
      </div>

      {/* Link */}
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.viewBtn}
          id={`pub-link-${index}`}
        >
          <BookOpen size={13} />
          View Publication
          <ExternalLink size={11} />
        </a>
      )}
    </motion.div>
  );
}
