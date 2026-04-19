"""
ClinicalTrials.gov Fetcher — Queries the v2 API for relevant clinical trials.
Extracts comprehensive trial metadata including eligibility, contacts, location.
"""

import asyncio
import os
from typing import List, Dict, Any
import httpx

CLINICAL_TRIALS_BASE = os.getenv("CLINICAL_TRIALS_BASE_URL", "https://clinicaltrials.gov/api/v2")


async def fetch_trials_page(
    disease: str,
    location: str = "",
    status: str = "RECRUITING,COMPLETED,ACTIVE_NOT_RECRUITING",
    page_size: int = 25,
    page_token: str = None,
) -> Dict[str, Any]:
    """Fetch a single page of clinical trials."""
    url = f"{CLINICAL_TRIALS_BASE}/studies"
    params = {
        "query.cond": disease,
        "filter.overallStatus": status,
        "pageSize": page_size,
        "format": "json",
        "fields": "NCTId,BriefTitle,OfficialTitle,OverallStatus,Phase,StudyType,BriefSummary,EligibilityModule,LocationModule,ContactsLocationsModule,StartDate,CompletionDate,EnrollmentInfo",
    }
    
    if location and location.strip():
        params["query.locn"] = location
    
    if page_token:
        params["pageToken"] = page_token
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(url, params=params)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"[ClinicalTrials] Fetch error for '{disease}': {e}")
            return {}


def parse_trial(study: dict) -> Dict[str, Any]:
    """Parse a clinical trial study into structured object."""
    protocol = study.get("protocolSection", {})
    
    # Identification
    id_module = protocol.get("identificationModule", {})
    nct_id = id_module.get("nctId", "")
    title = id_module.get("briefTitle", "") or id_module.get("officialTitle", "Unknown Trial")
    
    # Status
    status_module = protocol.get("statusModule", {})
    status = status_module.get("overallStatus", "Unknown")
    start_date = status_module.get("startDateStruct", {}).get("date", "N/A")
    completion_date = status_module.get("completionDateStruct", {}).get("date", "N/A")
    
    # Description
    desc_module = protocol.get("descriptionModule", {})
    summary = desc_module.get("briefSummary", "No summary available.")[:800]
    
    # Design / Phase
    design_module = protocol.get("designModule", {})
    phases = design_module.get("phases", [])
    phase = ", ".join(phases) if phases else "N/A"
    study_type = design_module.get("studyType", "N/A")
    enrollment = design_module.get("enrollmentInfo", {}).get("count", "N/A")
    
    # Eligibility
    eligibility_module = protocol.get("eligibilityModule", {})
    eligibility_criteria = eligibility_module.get("eligibilityCriteria", "")[:600]
    min_age = eligibility_module.get("minimumAge", "N/A")
    max_age = eligibility_module.get("maximumAge", "N/A")
    sex = eligibility_module.get("sex", "All")
    
    # Locations
    contacts_module = protocol.get("contactsLocationsModule", {})
    locations_raw = contacts_module.get("locations", [])
    locations = []
    for loc in locations_raw[:5]:  # Max 5 locations
        city = loc.get("city", "")
        country = loc.get("country", "")
        facility = loc.get("facility", "")
        loc_str = ", ".join(filter(None, [facility, city, country]))
        if loc_str:
            locations.append(loc_str)
    
    # Contacts
    central_contacts = contacts_module.get("centralContacts", [])
    contacts = []
    for c in central_contacts[:2]:
        name = c.get("name", "")
        role = c.get("role", "")
        phone = c.get("phone", "")
        email = c.get("email", "")
        contact_str = f"{name} ({role})"
        if email:
            contact_str += f" — {email}"
        if phone:
            contact_str += f" | {phone}"
        if name:
            contacts.append(contact_str)
    
    return {
        "id": nct_id,
        "title": title,
        "status": status,
        "phase": phase,
        "study_type": study_type,
        "summary": summary,
        "eligibility": eligibility_criteria,
        "min_age": min_age,
        "max_age": max_age,
        "sex": sex,
        "enrollment": enrollment,
        "locations": locations if locations else ["Location not specified"],
        "contacts": contacts if contacts else [],
        "start_date": start_date,
        "completion_date": completion_date,
        "url": f"https://clinicaltrials.gov/study/{nct_id}" if nct_id else "",
        "source": "ClinicalTrials.gov",
        "relevance_score": 0.0,
    }


async def fetch_clinical_trials(
    disease: str,
    location: str = "",
    max_results: int = 50,
) -> List[Dict[str, Any]]:
    """
    Main entry: Fetch clinical trials for a disease.
    Fetches RECRUITING first (most relevant for patients), then COMPLETED for evidence.
    Returns up to max_results deduplicated trials.
    """
    tasks = [
        # Fetch recruiting trials (most actionable)
        fetch_trials_page(disease, location, status="RECRUITING", page_size=25),
        # Fetch completed trials (proven evidence)
        fetch_trials_page(disease, location, status="COMPLETED", page_size=15),
        # Fetch active not recruiting
        fetch_trials_page(disease, location, status="ACTIVE_NOT_RECRUITING", page_size=10),
    ]
    
    responses = await asyncio.gather(*tasks)
    
    seen_ids = set()
    trials = []
    
    for response in responses:
        studies = response.get("studies", [])
        for study in studies:
            trial = parse_trial(study)
            if trial["id"] and trial["id"] not in seen_ids:
                seen_ids.add(trial["id"])
                trials.append(trial)
    
    result = trials[:max_results]
    print(f"[ClinicalTrials] Fetched {len(result)} unique trials for '{disease}'")
    return result
