.PHONY: help seed eval test dev dev-backend dev-frontend build demo

help:
	@echo "TrustAgent Development Commands:"
	@echo "  make seed         - Seed RAG knowledge base with 32 factual documents"
	@echo "  make eval         - Generate 150-item benchmark, run eval & generate charts"
	@echo "  make test         - Run pytest test suite (34 unit & integration tests)"
	@echo "  make build        - Compile TypeScript frontend bundle"
	@echo "  make dev          - Start both backend (FastAPI) and frontend (Vite)"
	@echo "  make demo         - Run complete demo system"

seed:
	python ./backend/data/seed_kb.py

eval:
	python ./eval/generate_dataset.py
	python ./eval/run_eval.py
	python ./eval/report.py

test:
	python -m pytest backend/tests/test_trustagent.py -v

build:
	cd frontend && npm run build

dev-backend:
	uvicorn app.main:app --host 127.0.0.1 --port 8000 --app-dir backend

dev-frontend:
	cd frontend && npm run dev

dev:
	@echo "Starting TrustAgent backend and frontend..."
	python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --app-dir backend

demo: dev
