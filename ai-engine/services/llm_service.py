"""
LLM Service — Ollama integration for streaming, structured medical research responses.
Uses a carefully engineered system prompt to produce non-hallucinated, source-backed answers.
"""

import os
from typing import Any, AsyncGenerator, Dict, List
import ollama
from groq import AsyncGroq

OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.2-3b-preview")


def build_system_prompt() -> str:
    return """You are CuraLink, an expert AI Medical Research Assistant. Your role is to synthesize medical research publications and clinical trials into clear, accurate, and personalized responses.

CRITICAL RULES:
1. Base ALL claims strictly on the provided publications and trials — never hallucinate or invent data
2. Always cite sources by referencing publication titles/authors when making claims
3. Structure your response with clear sections
4. Use plain language while maintaining scientific accuracy
5. Include a disclaimer that this is research information, not medical advice
6. Be specific and detailed — avoid generic statements

RESPONSE FORMAT (use this exact structure):

## 🔬 Condition Overview
Brief context about the disease/condition and the research landscape.

## 📚 Research Insights
For each key finding from the publications:
- **Finding**: [specific research insight]
  - *Source*: [Author(s), Year — Journal]
  - *Evidence*: [Brief supporting snippet from abstract]

## 🧪 Clinical Trials
For each relevant trial:
- **[Trial Title]**
  - Status: [RECRUITING/COMPLETED]
  - Phase: [Phase]
  - Eligibility: [Brief criteria]
  - Location: [Location]

## 💡 Key Takeaways
3-5 concise, research-backed takeaways personalized to the user's query.

## ⚠️ Important Note
Always end with: "This information is for research purposes only and does not constitute medical advice. Please consult a qualified healthcare professional."
"""


def build_user_prompt(
    disease: str,
    query: str,
    location: str,
    patient_name: str,
    publications: List[Dict[str, Any]],
    trials: List[Dict[str, Any]],
    conversation_history: List[Dict],
) -> str:
    """Build the complete RAG prompt with retrieved context."""
    
    # Format conversation history for context
    history_text = ""
    if conversation_history:
        history_text = "\n\n### Previous Conversation Context:\n"
        for turn in conversation_history[-4:]:  # Last 4 turns for context
            role = turn.get("role", "").capitalize()
            content = turn.get("content", "")[:300]  # Truncate long history
            history_text += f"**{role}**: {content}\n"
    
    # Format publications (Reduced to top 4 for much faster latency)
    pubs_text = ""
    if publications:
        pubs_text = "\n\n### Retrieved Publications:\n"
        for i, pub in enumerate(publications[:4], 1):
            title = pub.get("title", "Unknown")
            authors = ", ".join(pub.get("authors", ["Unknown"])[:3])
            year = pub.get("year", "N/A")
            source = pub.get("source", "Unknown")
            abstract = pub.get("abstract", "No abstract")[:300]
            journal = pub.get("journal", "Unknown Journal")
            
            pubs_text += f"""
**Publication {i}:**
- Title: {title}
- Authors: {authors}
- Year: {year} | Journal: {journal} | Source: {source}
- Abstract excerpt: {abstract}
"""
    
    # Format clinical trials (Reduced to top 3)
    trials_text = ""
    if trials:
        trials_text = "\n\n### Retrieved Clinical Trials:\n"
        for i, trial in enumerate(trials[:3], 1):
            title = trial.get("title", "Unknown Trial")
            status = trial.get("status", "Unknown")
            phase = trial.get("phase", "N/A")
            eligibility = trial.get("eligibility", "")[:200]
            locations = ", ".join(trial.get("locations", [])[:2])
            
            trials_text += f"""
**Trial {i}:**
- Title: {title}
- Status: {status} | Phase: {phase}
- Location: {locations}
- Eligibility: {eligibility[:150]}
"""
    
    # Build the full prompt
    user_context = f"Disease/Condition: {disease}"
    if query and query.lower() not in disease.lower():
        user_context += f"\nSpecific Question: {query}"
    if location:
        user_context += f"\nLocation: {location}"
    if patient_name:
        user_context += f"\nPatient/User: {patient_name}"
    
    prompt = f"""### User Query:
{user_context}
{history_text}
{pubs_text}
{trials_text}

### Instructions:
Based ONLY on the above publications and clinical trials, provide a comprehensive, structured, research-backed response to the user's query about {disease}. 
- Reference specific papers by their title/authors when citing evidence
- Be specific about findings, not generic
- If follow-up question, maintain context about {disease}
- Highlight the most actionable/relevant findings first
"""
    
    return prompt


async def stream_llm_response(
    disease: str,
    query: str,
    location: str,
    patient_name: str,
    publications: List[Dict[str, Any]],
    trials: List[Dict[str, Any]],
    conversation_history: List[Dict],
) -> AsyncGenerator[str, None]:
    """
    Stream LLM response tokens via Ollama.
    Uses the ollama Python client with stream=True.
    """
    system_prompt = build_system_prompt()
    user_prompt = build_user_prompt(
        disease=disease,
        query=query,
        location=location,
        patient_name=patient_name,
        publications=publications,
        trials=trials,
        conversation_history=conversation_history,
    )
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]
    
    try:
        # 1. Try Groq first if API key is provided (Recommended for Hosted Deployment)
        if GROQ_API_KEY:
            client = AsyncGroq(api_key=GROQ_API_KEY)
            stream = await client.chat.completions.create(
                model=GROQ_MODEL,
                messages=messages,
                stream=True,
                temperature=0.3,
                max_tokens=2048,
                top_p=0.9,
            )
            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
            return

        # 2. Fallback to Local Ollama
        client = ollama.AsyncClient(host=OLLAMA_HOST)
        
        stream = await client.chat(
            model=OLLAMA_MODEL,
            messages=messages,
            stream=True,
            options={
                "temperature": 0.3,
                "top_p": 0.9,
                "num_ctx": 4096,
                "num_predict": 1024,
                "repeat_penalty": 1.1,
            },
        )
        
        async for chunk in stream:
            content = chunk["message"]["content"]
            if content:
                yield content
                
    except Exception as e:
        error_msg = str(e)
        if "ConnectionRefusedError" in error_msg or "11434" in error_msg:
            yield "\n\n**⚠️ AI Engine Error**: Cannot connect to Ollama. For hosting, please provide a `GROQ_API_KEY`. For local, ensure Ollama is running.\n\n"
        elif "model" in error_msg.lower() and "not found" in error_msg.lower():
            yield f"\n\n**⚠️ Model Error**: Model not found. Run `ollama pull {OLLAMA_MODEL}` or use Groq.\n\n"
        else:
            yield f"\n\n**⚠️ AI Error**: {error_msg}\n\n"
