"""
PubMed Fetcher — Two-step fetch: esearch (IDs) → efetch (full details via XML parsing)
Retrieves up to 100 publications with full metadata.
"""

import asyncio
import os
import re
import xml.etree.ElementTree as ET
from typing import List, Dict, Any
import httpx

PUBMED_BASE = os.getenv("PUBMED_BASE_URL", "https://eutils.ncbi.nlm.nih.gov/entrez/eutils")


async def search_pubmed_ids(query: str, max_results: int = 50) -> List[str]:
    """Step 1: Get PubMed article IDs for a query."""
    url = f"{PUBMED_BASE}/esearch.fcgi"
    params = {
        "db": "pubmed",
        "term": query,
        "retmax": max_results,
        "sort": "pub date",
        "retmode": "json",
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            return data.get("esearchresult", {}).get("idlist", [])
        except Exception as e:
            print(f"[PubMed] esearch error for '{query}': {e}")
            return []


async def fetch_pubmed_details(ids: List[str]) -> List[Dict[str, Any]]:
    """Step 2: Fetch full article details for a list of PubMed IDs via XML."""
    if not ids:
        return []
    
    # Batch in chunks of 50 for API limits
    results = []
    chunk_size = 50
    chunks = [ids[i:i+chunk_size] for i in range(0, len(ids), chunk_size)]
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        for chunk in chunks:
            url = f"{PUBMED_BASE}/efetch.fcgi"
            params = {
                "db": "pubmed",
                "id": ",".join(chunk),
                "retmode": "xml",
            }
            try:
                response = await client.get(url, params=params)
                response.raise_for_status()
                articles = parse_pubmed_xml(response.text)
                results.extend(articles)
            except Exception as e:
                print(f"[PubMed] efetch error: {e}")
    
    return results


def parse_pubmed_xml(xml_text: str) -> List[Dict[str, Any]]:
    """Parse PubMed XML response into structured publication objects."""
    publications = []
    
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError as e:
        print(f"[PubMed] XML parse error: {e}")
        return []
    
    for article in root.findall(".//PubmedArticle"):
        try:
            pub = {}
            
            # Extract PMID
            pmid_el = article.find(".//PMID")
            pub["id"] = pmid_el.text if pmid_el is not None else ""
            
            # Extract title
            title_el = article.find(".//ArticleTitle")
            pub["title"] = clean_text(title_el.text if title_el is not None else "Unknown Title")
            
            # Extract abstract
            abstract_parts = article.findall(".//AbstractText")
            if abstract_parts:
                abstract = " ".join(
                    clean_text(p.text or "") for p in abstract_parts if p.text
                )
            else:
                abstract = "No abstract available."
            pub["abstract"] = abstract[:1000]  # Truncate for token efficiency
            
            # Extract authors
            authors = []
            for author in article.findall(".//Author")[:5]:  # Max 5 authors
                last = author.find("LastName")
                first = author.find("ForeName")
                if last is not None:
                    name = last.text or ""
                    if first is not None and first.text:
                        name = f"{first.text[0]}. {name}"
                    authors.append(name)
            pub["authors"] = authors if authors else ["Unknown Author"]
            
            # Extract year
            year_el = article.find(".//PubDate/Year")
            if year_el is None:
                year_el = article.find(".//PubDate/MedlineDate")
            pub["year"] = year_el.text[:4] if year_el is not None and year_el.text else "N/A"
            
            # Extract journal
            journal_el = article.find(".//Journal/Title")
            if journal_el is None:
                journal_el = article.find(".//MedlineTA")
            pub["journal"] = journal_el.text if journal_el is not None else "Unknown Journal"
            
            # Build DOI / URL
            doi_el = article.find(".//ArticleId[@IdType='doi']")
            if doi_el is not None and doi_el.text:
                pub["doi"] = doi_el.text
                pub["url"] = f"https://doi.org/{doi_el.text}"
            else:
                pub["doi"] = ""
                pub["url"] = f"https://pubmed.ncbi.nlm.nih.gov/{pub['id']}/" if pub["id"] else ""
            
            pub["source"] = "PubMed"
            pub["relevance_score"] = 0.0  # Will be set by reranker
            
            if pub["title"] and pub["title"] != "Unknown Title":
                publications.append(pub)
                
        except Exception as e:
            print(f"[PubMed] Article parse error: {e}")
    
    return publications


def clean_text(text: str) -> str:
    """Remove XML tags and extra whitespace."""
    if not text:
        return ""
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


async def fetch_pubmed_publications(
    primary_query: str,
    expanded_queries: List[str],
    max_results: int = 100
) -> List[Dict[str, Any]]:
    """
    Main entry: Fetch publications from multiple expanded queries, deduplicate by ID.
    Returns up to max_results unique publications.
    """
    # Distribute results across queries
    per_query = max(20, max_results // len(expanded_queries))
    
    # Fetch IDs for all queries in parallel
    id_tasks = [search_pubmed_ids(q, per_query) for q in expanded_queries]
    all_id_lists = await asyncio.gather(*id_tasks)
    
    # Deduplicate IDs while preserving order
    seen_ids = set()
    unique_ids = []
    for id_list in all_id_lists:
        for pmid in id_list:
            if pmid not in seen_ids:
                seen_ids.add(pmid)
                unique_ids.append(pmid)
    
    # Cap at max_results
    unique_ids = unique_ids[:max_results]
    
    if not unique_ids:
        return []
    
    # Fetch details for all unique IDs
    publications = await fetch_pubmed_details(unique_ids)
    
    print(f"[PubMed] Fetched {len(publications)} publications from {len(unique_ids)} IDs")
    return publications
