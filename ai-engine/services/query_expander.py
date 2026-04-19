"""
Query Expander — Intelligently expands user input into optimized multi-term search queries.
Instead of "deep brain stimulation", generates "DBS + Parkinson's disease", etc.
"""

import re
from typing import List

# Medical synonyms and related terms for common conditions
DISEASE_SYNONYMS = {
    "parkinson": ["parkinson's disease", "PD", "parkinsonism", "lewy body", "dopamine"],
    "alzheimer": ["alzheimer's disease", "AD", "dementia", "cognitive decline", "amyloid"],
    "cancer": ["oncology", "tumor", "malignancy", "neoplasm", "carcinoma"],
    "lung cancer": ["NSCLC", "non-small cell lung cancer", "SCLC", "pulmonary carcinoma"],
    "breast cancer": ["breast carcinoma", "HER2", "mammary tumor", "BRCA"],
    "diabetes": ["diabetes mellitus", "T2DM", "T1DM", "insulin resistance", "hyperglycemia"],
    "heart disease": ["cardiovascular disease", "coronary artery disease", "myocardial infarction", "CAD"],
    "stroke": ["cerebrovascular accident", "CVA", "ischemic stroke", "hemorrhagic stroke"],
    "depression": ["major depressive disorder", "MDD", "clinical depression", "antidepressant"],
    "hypertension": ["high blood pressure", "arterial hypertension", "antihypertensive"],
    "arthritis": ["rheumatoid arthritis", "RA", "osteoarthritis", "joint inflammation"],
    "asthma": ["bronchial asthma", "airway inflammation", "bronchospasm", "inhaler therapy"],
    "obesity": ["BMI", "metabolic syndrome", "weight management", "bariatric"],
    "multiple sclerosis": ["MS", "demyelination", "autoimmune neurological"],
    "epilepsy": ["seizure disorder", "anticonvulsant", "EEG", "neurological"],
    "hiv": ["HIV/AIDS", "antiretroviral therapy", "ART", "CD4 count", "viral load"],
    "hepatitis": ["liver disease", "cirrhosis", "antiviral therapy", "HBV", "HCV"],
    "kidney disease": ["chronic kidney disease", "CKD", "renal failure", "nephrology"],
    "copd": ["chronic obstructive pulmonary disease", "emphysema", "bronchitis", "pulmonary"],
}

# Intent-based query modifiers
INTENT_MODIFIERS = {
    "treatment": ["therapy", "treatment options", "therapeutic intervention", "clinical management"],
    "trial": ["clinical trial", "randomized controlled trial", "RCT", "phase III"],
    "diagnosis": ["diagnostic criteria", "biomarker", "screening", "detection"],
    "prevention": ["preventive", "prophylaxis", "risk reduction", "protective factor"],
    "drug": ["pharmacotherapy", "medication", "drug efficacy", "side effects"],
    "surgery": ["surgical intervention", "operative", "minimally invasive"],
    "gene": ["gene therapy", "genomics", "CRISPR", "genetic mutation"],
    "stem cell": ["stem cell therapy", "regenerative medicine", "cell transplant"],
    "vaccine": ["vaccination", "immunization", "mRNA vaccine", "immunotherapy"],
    "nutrition": ["dietary intervention", "nutritional therapy", "supplement"],
}


def normalize_text(text: str) -> str:
    """Normalize text for comparison."""
    return text.lower().strip()


def find_disease_synonyms(disease: str) -> List[str]:
    """Find medical synonyms for a disease."""
    disease_norm = normalize_text(disease)
    synonyms = []
    for key, vals in DISEASE_SYNONYMS.items():
        if key in disease_norm or disease_norm in key:
            synonyms.extend(vals)
    return synonyms[:3]  # Max 3 synonyms to avoid over-expansion


def find_intent_modifiers(query: str) -> List[str]:
    """Extract intent modifiers from the query."""
    query_norm = normalize_text(query)
    modifiers = []
    for key, vals in INTENT_MODIFIERS.items():
        if key in query_norm:
            modifiers.extend(vals[:2])
    return modifiers[:4]


def expand_query(disease: str, query: str, location: str = "") -> List[str]:
    """
    Expand user input into multiple optimized search queries.
    
    Strategy:
    1. Primary combined query: disease + query
    2. Synonym-expanded: disease synonyms + query terms
    3. Intent-focused: disease + intent modifiers
    4. Recent/review focused: primary + "systematic review" or "meta-analysis"
    5. Location-specific: if location provided
    
    Returns list of 3-5 distinct query strings.
    """
    queries = []
    
    # Clean inputs
    disease_clean = disease.strip()
    query_clean = query.strip()
    
    # 1. Primary combined query
    if query_clean and query_clean.lower() not in disease_clean.lower():
        primary = f"{disease_clean} {query_clean}"
    else:
        primary = disease_clean
    queries.append(primary)
    
    # 2. Disease synonyms + query
    synonyms = find_disease_synonyms(disease_clean)
    if synonyms and query_clean:
        synonym_query = f"{synonyms[0]} {query_clean}"
        if synonym_query not in queries:
            queries.append(synonym_query)
    
    # 3. Intent-focused modifiers
    intent_mods = find_intent_modifiers(query_clean)
    if intent_mods:
        intent_query = f"{disease_clean} {intent_mods[0]}"
        if intent_query not in queries:
            queries.append(intent_query)
    
    # 4. Add systematic review / meta-analysis for higher-quality evidence
    review_query = f"{disease_clean} systematic review meta-analysis"
    queries.append(review_query)
    
    # 5. Clinical trial focused
    trial_query = f"{disease_clean} clinical trial randomized"
    if query_clean:
        trial_query = f"{disease_clean} {query_clean} clinical trial"
    queries.append(trial_query)
    
    # 6. Location-specific if provided
    if location and location.strip():
        location_query = f"{primary} {location.strip()}"
        queries.append(location_query)
    
    # Deduplicate while preserving order
    seen = set()
    unique_queries = []
    for q in queries:
        q_norm = normalize_text(q)
        if q_norm not in seen:
            seen.add(q_norm)
            unique_queries.append(q)
    
    return unique_queries[:5]  # Max 5 queries
