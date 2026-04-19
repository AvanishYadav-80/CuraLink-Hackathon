import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Brain, FlaskConical, Search, ChevronRight,
  BookOpen, Microscope, Activity, Globe, Sparkles, ArrowRight
} from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import GlassBackground from "../components/GlassBackground";
import PlexusBackground from "../components/PlexusBackground";
import styles from "./HomePage.module.css";

const DEMO_QUERIES = [
  { disease: "Lung Cancer", query: "Latest immunotherapy treatments", icon: "🫁" },
  { disease: "Parkinson's Disease", query: "Deep brain stimulation outcomes", icon: "🧠" },
  { disease: "Type 2 Diabetes", query: "Clinical trials for insulin resistance", icon: "🩸" },
  { disease: "Alzheimer's Disease", query: "Top researchers and recent breakthroughs", icon: "🔬" },
];

const FEATURES = [
  {
    icon: <Search size={22} />,
    title: "Deep Retrieval",
    desc: "Fetches 300+ candidates from PubMed, OpenAlex & ClinicalTrials.gov before precision filtering",
    color: "var(--color-primary)",
  },
  {
    icon: <Brain size={22} />,
    title: "AI Reasoning",
    desc: "Open-source LLM (Ollama) synthesizes research into structured, non-hallucinated answers",
    color: "var(--color-purple)",
  },
  {
    icon: <Microscope size={22} />,
    title: "Clinical Trials",
    desc: "Real-time recruiting trials with eligibility criteria, locations, and contact info",
    color: "var(--color-accent)",
  },
  {
    icon: <Activity size={22} />,
    title: "Smart Re-Ranking",
    desc: "TF-IDF + recency + credibility scoring ensures only the most relevant results surface",
    color: "var(--color-amber)",
  },
];



export default function HomePage() {
  const navigate = useNavigate();
  const [hoveredQuery, setHoveredQuery] = useState(null);

  const handleDemoQuery = (q) => {
    navigate(`/chat?disease=${encodeURIComponent(q.disease)}&query=${encodeURIComponent(q.query)}`);
  };

  const handleStart = () => navigate("/chat");

  return (
    <div className={styles.page}>
      <PlexusBackground />

      {/* ── Navbar ── */}
      <nav className={styles.nav}>
        <div className={styles.navLogo}>
          <div className={styles.logoIcon}>
            <FlaskConical size={18} />
          </div>
          <span className={styles.logoText}>CuraLink</span>
        </div>
        <div className={styles.navLinks}>
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
        </div>
        <div className={styles.navCta}>
          <ThemeToggle />
          <button className="btn btn-primary" onClick={handleStart}>
            Start Research <ArrowRight size={16} />
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <GlassBackground />
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className={styles.heroContent}
        >
          <div className={styles.heroBadge}>
            <Sparkles size={14} />
            <span>Powered by Open-Source LLM + 3 Medical APIs</span>
          </div>

          <h1 className={styles.heroTitle}>
            Your AI
            <span className={styles.heroGradient}> Medical Research</span>
            <br />
            Companion
          </h1>

          <p className={styles.heroSubtitle}>
            Ask about any disease. Get structured, research-backed answers from
            PubMed, OpenAlex &amp; ClinicalTrials.gov — synthesized by AI.
            <br />
            <strong>Not generic advice. Real research. Real sources.</strong>
          </p>

          <div className={styles.heroCta}>
            <button className="btn btn-primary" id="start-research-btn" onClick={handleStart} style={{ padding: "0.875rem 2rem", fontSize: "1rem" }}>
              <Search size={18} />
              Start Researching
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
            >
              Learn more <ChevronRight size={16} />
            </button>
          </div>

          {/* Stats row */}
          <div className={styles.heroStats}>
            {[
              { label: "Publications Scanned", value: "300+" },
              { label: "Clinical Trial Sources", value: "Live" },
              { label: "AI-Powered Re-Ranking", value: "TF-IDF" },
              { label: "LLM", value: "Ollama" },
            ].map((s) => (
              <div key={s.label} className={styles.statItem}>
                <span className={styles.statValue}>{s.value}</span>
                <span className={styles.statLabel}>{s.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Hero visual */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className={styles.heroVisual}
        >
          <div className={styles.heroCard}>
            <div className={styles.heroCardHeader}>
              <div className={styles.cardDots}>
                <span /><span /><span />
              </div>
              <span className={styles.cardTitle}>CuraLink Research</span>
            </div>
            <div className={styles.heroCardBody}>
              <div className={styles.mockQuery}>
                <Search size={14} />
                <span>Parkinson's Disease + Deep Brain Stimulation</span>
              </div>
              <div className={styles.mockStats}>
                <div className={styles.mockStat}>
                  <span className={styles.mockStatNum}>127</span>
                  <span>PubMed results</span>
                </div>
                <div className={styles.mockStat}>
                  <span className={styles.mockStatNum}>200</span>
                  <span>OpenAlex works</span>
                </div>
                <div className={styles.mockStat}>
                  <span className={styles.mockStatNum}>48</span>
                  <span>Clinical Trials</span>
                </div>
              </div>
              <div className={styles.mockPubs}>
                {[
                  { title: "DBS improves motor function in PD patients", year: "2024", src: "PubMed" },
                  { title: "Long-term outcomes of subthalamic stimulation", year: "2023", src: "OpenAlex" },
                  { title: "Phase III Trial: Adaptive DBS vs Standard", year: "2024", src: "ClinicalTrials" },
                ].map((p) => (
                  <div key={p.title} className={styles.mockPubItem}>
                    <span className={`badge ${p.src === "PubMed" ? "badge-pubmed" : p.src === "OpenAlex" ? "badge-openalex" : "badge-recruiting"}`}>{p.src}</span>
                    <span className={styles.mockPubTitle}>{p.title}</span>
                    <span className={styles.mockPubYear}>{p.year}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Demo Queries ── */}
      <section className={styles.demoSection} id="how-it-works">
        <h2 className={styles.sectionTitle}>Try a quick search</h2>
        <p className={styles.sectionSubtitle}>Click any example to see CuraLink in action</p>
        <div className={styles.demoGrid}>
          {DEMO_QUERIES.map((q, i) => (
            <motion.button
              key={q.disease}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`${styles.demoCard} ${hoveredQuery === i ? styles.demoCardHovered : ""}`}
              onMouseEnter={() => setHoveredQuery(i)}
              onMouseLeave={() => setHoveredQuery(null)}
              onClick={() => handleDemoQuery(q)}
              id={`demo-query-${i}`}
            >
              <span className={styles.demoEmoji}>{q.icon}</span>
              <div>
                <div className={styles.demoDisease}>{q.disease}</div>
                <div className={styles.demoQuery}>{q.query}</div>
              </div>
              <ArrowRight size={16} className={styles.demoArrow} />
            </motion.button>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className={styles.featuresSection} id="features">
        <h2 className={styles.sectionTitle}>Built for Precision</h2>
        <p className={styles.sectionSubtitle}>
          Every layer of the pipeline is designed for depth, accuracy, and reliability
        </p>
        <div className={styles.featuresGrid}>
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
              className={`${styles.featureCard} glass-card`}
            >
              <div className={styles.featureIcon} style={{ color: f.color, background: `${f.color}18` }}>
                {f.icon}
              </div>
              <h3 className={styles.featureTitle}>{f.title}</h3>
              <p className={styles.featureDesc}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className={styles.ctaSection}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className={styles.ctaBox}
        >
          <Globe size={40} className={styles.ctaIcon} />
          <h2 className={styles.ctaTitle}>Ready to explore medical research?</h2>
          <p className={styles.ctaDesc}>Join researchers using AI to surface the most relevant, recent, and reliable medical evidence.</p>
          <button className="btn btn-primary" onClick={handleStart} style={{ padding: "0.875rem 2.5rem", fontSize: "1rem" }}>
            Launch CuraLink <ArrowRight size={18} />
          </button>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        <div className={styles.footerLogo}>
          <FlaskConical size={16} />
          <span>CuraLink</span>
        </div>
        <p>AI Medical Research Assistant · Built with MERN + Python FastAPI + Ollama</p>
        <p className={styles.footerNote}>For research purposes only. Not a substitute for medical advice.</p>
      </footer>
    </div>
  );
}
