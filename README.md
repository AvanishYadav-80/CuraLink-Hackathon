# CuraLink — AI Medical Research Assistant

> Full-stack AI system: MERN + Python FastAPI + Ollama (llama3.2:3b)  
> Retrieves 300+ papers from PubMed, OpenAlex & ClinicalTrials.gov → Re-ranks → LLM synthesizes

## 🏗️ Architecture

```
frontend/    → React + Vite (Dribbble-inspired UI)
backend/     → Node.js + Express + MongoDB Atlas (API Gateway)
ai-engine/   → Python FastAPI + Ollama (LLM reasoning + retrieval)
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+, Python 3.10+, Ollama installed
- MongoDB Atlas connection (already configured in .env)
- Run: `ollama pull llama3.2:3b`

### 1. AI Engine (Python)
```bash
cd ai-engine
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

### 2. Backend (Node.js)
```bash
cd backend
npm install
npm run dev
```

### 3. Frontend (React)
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## 🧠 Pipeline

```
User Query → Query Expansion (5 variants)
         → PubMed (100 IDs → XML parse)
         → OpenAlex (200 works, 2 pages)
         → ClinicalTrials.gov (50 trials)
         → ~350 candidate pool
         → TF-IDF + Recency + Credibility Re-ranking
         → Top 8 Publications + Top 5 Trials
         → RAG Prompt → Ollama llama3.2:3b
         → Streaming SSE Response
         → MongoDB conversation persistence
```

## 📡 Deployment
- **Backend**: Render.com (set `AI_ENGINE_URL` to Python service URL)
- **Frontend**: Vercel (set `VITE_API_URL` to Render backend URL)
- **AI Engine**: Render.com (or any Python host)

## 🔑 Environment Variables

### backend/.env
```
MONGODB_URI=mongodb+srv://...
AI_ENGINE_URL=http://localhost:8000
PORT=5000
```

### ai-engine/.env
```
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
PORT=8000
```

### frontend/.env.production
```
VITE_API_URL=https://your-backend.onrender.com/api
```
