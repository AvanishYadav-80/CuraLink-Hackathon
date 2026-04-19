"""
OpenAlex Fetcher — Fetches up to 200 research publications with pagination.
Handles relevance + recency sorting, open-access URL extraction.
"""

import asyncio
import os
from typing import List, Dict, Any
import httpx

OPENALEX_BASE = os.getenv("OPENALEX_BASE_URL", "https://api.openalex.org")


async def fetch_openalex_page(
    query: str,
    page: int = 1,
    per_page: int = 50,
    sort: str = "relevance_score:desc",
    date_from: str = "2018-01-01",
) -> List[Dict[str, Any]]:
    """Fetch a single page of results from OpenAlex."""
    url = f"{OPENALEX_BASE}/works"
    params = {
        "search": query,
        "per-page": per_page,
        "page": page,
        "sort": sort,
        "filter": f"from_publication_date:{date_from}",
        "select": "id,title,abstract_inverted_index,authorships,publication_year,doi,primary_location,open_access,cited_by_count,type",
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            works = data.get("results", [])
            return [parse_openalex_work(w) for w in works if w.get("title")]
        except Exception as e:
            print(f"[OpenAlex] Fetch error for '{query}' page {page}: {e}")
            return []


def reconstruct_abstract(inverted_index: dict) -> str:
    """Reconstruct abstract from OpenAlex inverted index format."""
    if not inverted_index:
        return "No abstract available."
    
    try:
        # inverted_index: {word: [positions], ...}
        max_pos = max(pos for positions in inverted_index.values() for pos in positions)
        words = [""] * (max_pos + 1)
        for word, positions in inverted_index.items():
            for pos in positions:
                words[pos] = word
        abstract = " ".join(w for w in words if w)
        return abstract[:1000]
    except Exception:
        return "Abstract processing error."


def parse_openalex_work(work: dict) -> Dict[str, Any]:
    """Parse a single OpenAlex work into structured publication object."""
    # Title
    title = work.get("title", "Unknown Title") or "Unknown Title"
    
    # Abstract
    abstract_index = work.get("abstract_inverted_index")
    abstract = reconstruct_abstract(abstract_index) if abstract_index else "No abstract available."
    
    # Authors (max 5)
    authorships = work.get("authorships", [])[:5]
    authors = []
    for auth in authorships:
        author_obj = auth.get("author", {})
        name = author_obj.get("display_name", "")
        if name:
            authors.append(name)
    if not authors:
        authors = ["Unknown Author"]
    
    # Year
    year = str(work.get("publication_year", "N/A"))
    
    # DOI and URL
    doi = work.get("doi", "") or ""
    if doi.startswith("https://doi.org/"):
        doi = doi.replace("https://doi.org/", "")
    
    # Prefer open-access URL
    url = ""
    open_access = work.get("open_access", {})
    oa_url = open_access.get("oa_url", "")
    if oa_url:
        url = oa_url
    elif doi:
        url = f"https://doi.org/{doi}"
    else:
        openalex_id = work.get("id", "")
        url = openalex_id if openalex_id else ""
    
    # Journal/source
    primary_location = work.get("primary_location") or {}
    source = primary_location.get("source") or {}
    journal = source.get("display_name", "OpenAlex") if source else "OpenAlex"
    
    # Citation count for credibility scoring
    cited_by_count = work.get("cited_by_count", 0) or 0
    
    return {
        "id": work.get("id", ""),
        "title": title,
        "abstract": abstract,
        "authors": authors,
        "year": year,
        "journal": journal,
        "doi": doi,
        "url": url,
        "source": "OpenAlex",
        "cited_by_count": cited_by_count,
        "relevance_score": 0.0,
    }


async def fetch_openalex_publications(
    primary_query: str,
    expanded_queries: List[str],
    max_results: int = 200,
) -> List[Dict[str, Any]]:
    """
    Main entry: Fetch from OpenAlex using multiple queries and pagination.
    Uses both relevance and recency sorts for diversity.
    Returns up to max_results deduplicated publications.
    """
    tasks = []
    
    # For the primary query: fetch relevance + recency pages
    tasks.append(fetch_openalex_page(primary_query, page=1, per_page=50, sort="relevance_score:desc"))
    tasks.append(fetch_openalex_page(primary_query, page=2, per_page=50, sort="relevance_score:desc"))
    tasks.append(fetch_openalex_page(primary_query, page=1, per_page=50, sort="publication_date:desc"))
    
    # For secondary queries: 1 page each
    for q in expanded_queries[1:3]:  # Max 2 additional queries
        tasks.append(fetch_openalex_page(q, page=1, per_page=25, sort="relevance_score:desc"))
    
    all_results = await asyncio.gather(*tasks)
    
    # Flatten and deduplicate by DOI or ID
    seen = set()
    publications = []
    for page_results in all_results:
        for pub in page_results:
            key = pub.get("doi") or pub.get("id") or pub.get("title", "")
            if key and key not in seen:
                seen.add(key)
                publications.append(pub)
    
    result = publications[:max_results]
    print(f"[OpenAlex] Fetched {len(result)} unique publications")
    return result
