import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, MapPin, User, FlaskConical, Loader, Mic, ChevronDown } from "lucide-react";
import styles from "./StructuredInputForm.module.css";

const DISEASE_SUGGESTIONS = [
  "Lung Cancer", "Parkinson's Disease", "Alzheimer's Disease", "Type 2 Diabetes",
  "Heart Disease", "Breast Cancer", "Multiple Sclerosis", "COPD", "Epilepsy",
  "Rheumatoid Arthritis", "HIV/AIDS", "Hepatitis B", "Kidney Disease", "Stroke",
];

export default function StructuredInputForm({ onSubmit, isLoading, prefillDisease = "", prefillQuery = "" }) {
  const [disease, setDisease] = useState(prefillDisease);
  const [query, setQuery] = useState(prefillQuery);
  const [location, setLocation] = useState("");
  const [patientName, setPatientName] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const diseaseRef = useRef(null);
  const formRef = useRef(null);

  useEffect(() => {
    if (prefillDisease) setDisease(prefillDisease);
    if (prefillQuery) setQuery(prefillQuery);
  }, [prefillDisease, prefillQuery]);

  const filteredSuggestions = disease.length >= 1
    ? DISEASE_SUGGESTIONS.filter((d) => d.toLowerCase().includes(disease.toLowerCase())).slice(0, 5)
    : DISEASE_SUGGESTIONS.slice(0, 5);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!disease.trim() || !query.trim() || isLoading) return;
    setShowSuggestions(false);
    onSubmit({ disease: disease.trim(), query: query.trim(), location: location.trim(), patientName: patientName.trim() });
    setQuery("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const selectSuggestion = (s) => {
    setDisease(s);
    setShowSuggestions(false);
    diseaseRef.current?.blur();
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className={styles.form} id="research-form">
      {/* Disease row + query row */}
      <div className={styles.inputGrid}>
        {/* Disease input */}
        <div className={styles.inputWrapper} style={{ position: "relative" }}>
          <FlaskConical size={16} className={styles.inputIcon} />
          <input
            ref={diseaseRef}
            type="text"
            id="disease-input"
            placeholder="Disease or condition..."
            value={disease}
            onChange={(e) => { setDisease(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            className={styles.input}
            autoComplete="off"
            required
          />
          {showSuggestions && filteredSuggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className={styles.suggestions}
            >
              {filteredSuggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={styles.suggestionItem}
                  onMouseDown={() => selectSuggestion(s)}
                >
                  {s}
                </button>
              ))}
            </motion.div>
          )}
        </div>

        {/* Optional fields toggle */}
        <button
          type="button"
          className={styles.optionalToggle}
          onClick={() => setExpanded(!expanded)}
        >
          <ChevronDown size={14} style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
          {expanded ? "Less" : "More options"}
        </button>
      </div>

      {/* Optional fields */}
      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className={styles.optionalFields}
        >
          <div className={styles.inputWrapper}>
            <MapPin size={16} className={styles.inputIcon} />
            <input
              type="text"
              id="location-input"
              placeholder="Location (e.g., Toronto, Canada)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className={styles.input}
            />
          </div>
          <div className={styles.inputWrapper}>
            <User size={16} className={styles.inputIcon} />
            <input
              type="text"
              id="patient-name-input"
              placeholder="Patient name (optional)"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className={styles.input}
            />
          </div>
        </motion.div>
      )}

      {/* Query + Submit row */}
      <div className={styles.queryRow}>
        <div className={`${styles.inputWrapper} ${styles.queryWrapper}`}>
          <Search size={16} className={styles.inputIcon} />
          <textarea
            id="query-input"
            ref={(el) => {
              // Ensure we don't overwrite any existing ref if needed, but here we just need element access
              if (el) {
                el.style.height = 'auto';
                el.style.height = `${el.scrollHeight}px`;
              }
            }}
            placeholder="What would you like to know? (e.g. latest trials, key researchers...)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            onKeyDown={handleKeyDown}
            className={`${styles.input} ${styles.textarea}`}
            rows={1}
            required
          />
        </div>
        <motion.button
          type="submit"
          className={styles.submitBtn}
          disabled={isLoading || !disease.trim() || !query.trim()}
          whileTap={{ scale: 0.96 }}
          id="submit-query-btn"
        >
          {isLoading ? (
            <Loader size={18} className={styles.spinner} />
          ) : (
            <Search size={18} />
          )}
        </motion.button>
      </div>
    </form>
  );
}
