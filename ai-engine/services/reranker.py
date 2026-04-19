"""
Re-Ranker — Intelligent multi-factor ranking pipeline.

Ranking factors:
1. TF-IDF relevance score against the expanded query
2. Recency bonus (newer papers score higher)
3. Source credibility weight (PubMed > OpenAlex by default)
4. Citation count (for OpenAlex papers)
5. Abstract completeness (papers with abstracts score higher)

Publications and trials are ranked separately with tailored criteria.
"""

import math
import re
from datetime import datetime
from typing import Any, Dict, List

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


def normalize_score(score: float, min_val: float = 0.0, max_val: float = 1.0) -> float:
    """Normalize a score to [0, 1] range."""
    if max_val == min_val:
        return 0.5
    return max(0.0, min(1.0, (score - min_val) / (max_val - min_val)))


def compute_recency_score(year_str: str) -> float:
    """
    Compute recency score. Papers from 2023+ score 1.0, older papers decay.
    """
    current_year = datetime.now().year
    try:
        year = int(str(year_str)[:4])
    except (ValueError, TypeError):
        return 0.3  # Unknown year gets moderate score
    
    age = current_year - year
    if age <= 1:
        return 1.0
    elif age <= 3:
        return 0.85
    elif age <= 5:
        return 0.70
    elif age <= 8:
        return 0.50
    elif age <= 12:
        return 0.30
    else:
        return 0.15


def compute_credibility_score(pub: Dict[str, Any]) -> float:
    """Compute source credibility score."""
    source = pub.get("source", "").lower()
    cited_by = pub.get("cited_by_count", 0) or 0
    
    base_score = 0.0
    if source == "pubmed":
        base_score = 0.85  # PubMed is peer-reviewed curated
    elif source == "openalex":
        base_score = 0.70  # OpenAlex is broad academic
    else:
        base_score = 0.60
    
    # Boost for highly cited papers (in OpenAlex we have this data)
    citation_boost = 0.0
    if cited_by > 1000:
        citation_boost = 0.15
    elif cited_by > 500:
        citation_boost = 0.10
    elif cited_by > 100:
        citation_boost = 0.05
    elif cited_by > 50:
        citation_boost = 0.02
    
    return min(1.0, base_score + citation_boost)


def compute_completeness_score(pub: Dict[str, Any]) -> float:
    """Score based on data completeness."""
    score = 0.0
    abstract = pub.get("abstract", "")
    
    if abstract and len(abstract) > 100:
        score += 0.4
    if pub.get("authors") and pub["authors"] != ["Unknown Author"]:
        score += 0.2
    if pub.get("year") and pub["year"] != "N/A":
        score += 0.2
    if pub.get("url"):
        score += 0.1
    if pub.get("doi"):
        score += 0.1
    
    return score


def compute_tfidf_scores(publications: List[Dict[str, Any]], query: str) -> List[float]:
    """Compute TF-IDF cosine similarity scores between publications and query."""
    if not publications:
        return []
    
    # Build document corpus: title + abstract for each publication
    documents = []
    for pub in publications:
        title = pub.get("title", "") or ""
        abstract = pub.get("abstract", "") or ""
        doc = f"{title} {title} {abstract}"  # Title weighted 2x
        documents.append(doc)
    
    # Add query as the last document
    documents.append(query)
    
    try:
        vectorizer = TfidfVectorizer(
            stop_words="english",
            max_features=5000,
            ngram_range=(1, 2),  # Unigrams and bigrams
        )
        tfidf_matrix = vectorizer.fit_transform(documents)
        
        # Query vector is the last row
        query_vector = tfidf_matrix[-1]
        doc_vectors = tfidf_matrix[:-1]
        
        # Cosine similarity of each doc to query
        scores = cosine_similarity(doc_vectors, query_vector).flatten().tolist()
        return scores
    except Exception as e:
        print(f"[Reranker] TF-IDF error: {e}")
        return [0.5] * len(publications)


def rerank_publications(
    publications: List[Dict[str, Any]],
    query: str,
    top_k: int = 8,
) -> List[Dict[str, Any]]:
    """
    Main re-ranking function for publications.
    
    Combined score = 
        0.40 * TF-IDF relevance
      + 0.25 * Recency
      + 0.20 * Source credibility (+ citation boost)
      + 0.15 * Data completeness
    """
    if not publications:
        return []
    
    # Remove only the most broken publications
    valid_pubs = [
        p for p in publications
        if p.get("title") and p["title"] not in ["Unknown Title", "", "None"]
    ]
    
    if not valid_pubs:
        # If everything failed, just return the raw results instead of empty
        return publications[:top_k]
    
    # Compute TF-IDF scores
    tfidf_scores = compute_tfidf_scores(valid_pubs, query)
    
    # Compute final composite scores
    for i, pub in enumerate(valid_pubs):
        tfidf = tfidf_scores[i] if i < len(tfidf_scores) else 0.5
        recency = compute_recency_score(pub.get("year", "N/A"))
        credibility = compute_credibility_score(pub)
        completeness = compute_completeness_score(pub)
        
        composite = (
            0.40 * tfidf
            + 0.25 * recency
            + 0.20 * credibility
            + 0.15 * completeness
        )
        
        pub["relevance_score"] = round(composite, 4)
        pub["score_breakdown"] = {
            "relevance": round(tfidf, 3),
            "recency": round(recency, 3),
            "credibility": round(credibility, 3),
            "completeness": round(completeness, 3),
        }
    
    # Sort by composite score descending
    valid_pubs.sort(key=lambda p: p["relevance_score"], reverse=True)
    
    # Deduplicate by similar title (Levenshtein-lite: length + prefix match)
    deduped = []
    seen_titles = []
    for pub in valid_pubs:
        title_lower = pub["title"].lower()[:50]
        is_duplicate = any(
            title_lower == seen[:50] or
            (len(title_lower) > 20 and title_lower[:20] == seen[:20])
            for seen in seen_titles
        )
        if not is_duplicate:
            seen_titles.append(title_lower)
            deduped.append(pub)
        if len(deduped) >= top_k:
            break
    
    print(f"[Reranker] Publications: {len(publications)} → {len(deduped)} top results")
    return deduped


def rerank_trials(
    trials: List[Dict[str, Any]],
    disease: str,
    top_k: int = 5,
) -> List[Dict[str, Any]]:
    """
    Re-rank clinical trials.
    
    Priority order:
    1. RECRUITING (most actionable)
    2. ACTIVE_NOT_RECRUITING
    3. COMPLETED (evidence-based)
    4. Others
    
    Within same status: prefer trials with Phase III/IV, complete info, location.
    """
    if not trials:
        return []
    
    STATUS_PRIORITY = {
        "RECRUITING": 1.0,
        "ACTIVE_NOT_RECRUITING": 0.75,
        "ENROLLING_BY_INVITATION": 0.70,
        "COMPLETED": 0.60,
        "TERMINATED": 0.20,
        "WITHDRAWN": 0.10,
        "UNKNOWN": 0.05,
    }
    
    PHASE_SCORE = {
        "PHASE4": 1.0,
        "PHASE3": 0.90,
        "PHASE2": 0.70,
        "PHASE1": 0.50,
        "N/A": 0.30,
    }
    
    # Compute TF-IDF scores vs disease query
    tfidf_scores = compute_tfidf_scores(
        [{"title": t.get("title", ""), "abstract": t.get("summary", "")} for t in trials],
        disease
    )
    
    for i, trial in enumerate(trials):
        status = trial.get("status", "UNKNOWN").upper()
        status_score = STATUS_PRIORITY.get(status, 0.3)
        
        # Phase score
        phase = trial.get("phase", "N/A").upper().replace(" ", "").replace(",", "")
        phase_key = next((k for k in PHASE_SCORE if k in phase), "N/A")
        phase_score = PHASE_SCORE[phase_key]
        
        # Completeness: has locations + contacts + eligibility
        completeness = 0.0
        if trial.get("locations") and trial["locations"] != ["Location not specified"]:
            completeness += 0.4
        if trial.get("contacts"):
            completeness += 0.3
        if trial.get("eligibility") and len(trial["eligibility"]) > 50:
            completeness += 0.3
        
        tfidf = tfidf_scores[i] if i < len(tfidf_scores) else 0.5
        
        composite = (
            0.35 * status_score
            + 0.25 * tfidf
            + 0.25 * phase_score
            + 0.15 * completeness
        )
        
        trial["relevance_score"] = round(composite, 4)
    
    trials.sort(key=lambda t: t["relevance_score"], reverse=True)
    
    result = trials[:top_k]
    print(f"[Reranker] Trials: {len(trials)} → {len(result)} top results")
    return result
