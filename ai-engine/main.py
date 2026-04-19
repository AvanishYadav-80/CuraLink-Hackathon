"""
CuraLink AI Engine — FastAPI entry point
Handles: query expansion → retrieval → re-ranking → LLM reasoning → SSE streaming
"""

import asyncio
import json
import os
from typing import AsyncGenerator

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from services.clinical_trials_fetcher import fetch_clinical_trials
from services.llm_service import stream_llm_response
from services.openalex_fetcher import fetch_openalex_publications
from services.pubmed_fetcher import fetch_pubmed_publications
from services.query_expander import expand_query
from services.reranker import rerank_publications, rerank_trials

load_dotenv()

app = FastAPI(title="CuraLink AI Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class QueryRequest(BaseModel):
    disease: str
    query: str
    location: str = ""
    patient_name: str = ""
    conversation_history: list = []


class HealthCheck(BaseModel):
    status: str
    model: str


@app.get("/health", response_model=HealthCheck)
async def health_check():
    model = os.getenv("OLLAMA_MODEL", "llama3.2:3b")
    return {"status": "ok", "model": model}


@app.post("/api/research")
async def research_endpoint(req: QueryRequest):
    """
    Full pipeline: expand query → fetch from 3 sources → re-rank → return structured data
    (No LLM — used for fetching raw research results to display as cards)
    """
    try:
        expanded_queries = expand_query(req.disease, req.query, req.location)
        primary_query = expanded_queries[0]

        pubmed_task = asyncio.create_task(
            fetch_pubmed_publications(primary_query, expanded_queries, max_results=30)
        )
        openalex_task = asyncio.create_task(
            fetch_openalex_publications(primary_query, expanded_queries, max_results=40)
        )
        trials_task = asyncio.create_task(
            fetch_clinical_trials(req.disease, req.location, max_results=20)
        )

        pubmed_results, openalex_results, trial_results = await asyncio.gather(
            pubmed_task, openalex_task, trials_task
        )

        all_publications = pubmed_results + openalex_results

        ranked_publications = rerank_publications(all_publications, primary_query, top_k=8)
        ranked_trials = rerank_trials(trial_results, req.disease, top_k=5)

        return {
            "success": True,
            "query": primary_query,
            "expanded_queries": expanded_queries,
            "publications": ranked_publications,
            "clinical_trials": ranked_trials,
            "stats": {
                "total_publications_fetched": len(all_publications),
                "pubmed_count": len(pubmed_results),
                "openalex_count": len(openalex_results),
                "total_trials_fetched": len(trial_results),
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat/stream")
async def chat_stream(req: QueryRequest):
    """
    Full pipeline with SSE streaming LLM response.
    Returns Server-Sent Events for real-time streaming.
    """

    async def event_generator() -> AsyncGenerator[str, None]:
        try:
            # Step 1: Expand query
            expanded_queries = expand_query(req.disease, req.query, req.location)
            primary_query = expanded_queries[0]

            # Send status update
            yield f"data: {json.dumps({'type': 'status', 'message': 'Expanding search queries...'})}\n\n"

            # Step 2: Parallel fetch from all 3 sources
            yield f"data: {json.dumps({'type': 'status', 'message': 'Fetching from PubMed, OpenAlex, ClinicalTrials.gov...'})}\n\n"

            pubmed_task = asyncio.create_task(
                fetch_pubmed_publications(primary_query, expanded_queries, max_results=30)
            )
            openalex_task = asyncio.create_task(
                fetch_openalex_publications(primary_query, expanded_queries, max_results=40)
            )
            trials_task = asyncio.create_task(
                fetch_clinical_trials(req.disease, req.location, max_results=20)
            )

            pubmed_results, openalex_results, trial_results = await asyncio.gather(
                pubmed_task, openalex_task, trials_task
            )

            all_publications = pubmed_results + openalex_results

            # Send stats
            stats = {
                "total_publications_fetched": len(all_publications),
                "pubmed_count": len(pubmed_results),
                "openalex_count": len(openalex_results),
                "trials_count": len(trial_results),
            }
            yield f"data: {json.dumps({'type': 'stats', 'data': stats})}\n\n"

            # Step 3: Re-rank
            yield f"data: {json.dumps({'type': 'status', 'message': 'Re-ranking results for relevance...'})}\n\n"
            ranked_publications = rerank_publications(all_publications, primary_query, top_k=8)
            ranked_trials = rerank_trials(trial_results, req.disease, top_k=5)

            # Send research data
            yield f"data: {json.dumps({'type': 'research_data', 'publications': ranked_publications, 'trials': ranked_trials})}\n\n"

            # Step 4: Stream LLM response
            yield f"data: {json.dumps({'type': 'status', 'message': 'Generating AI analysis...'})}\n\n"

            async for chunk in stream_llm_response(
                disease=req.disease,
                query=req.query,
                location=req.location,
                patient_name=req.patient_name,
                publications=ranked_publications,
                trials=ranked_trials,
                conversation_history=req.conversation_history,
            ):
                yield f"data: {json.dumps({'type': 'token', 'content': chunk})}\n\n"

            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
