import os
from pathlib import Path
from dotenv import load_dotenv
from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from typing import Dict, Optional

# Automatically locate and load .env from project root or current working dir
_root = Path(__file__).resolve().parent.parent.parent
for _p in [Path(".env"), Path("backend/.env"), _root / ".env", Path("../.env")]:
    if _p.exists():
        load_dotenv(_p, override=False)

class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env", extra="ignore")

    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "auto")  # "auto", "groq", "gemini", "anthropic", "openai", "mock"
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    MODEL_NAME: str = os.getenv("MODEL_NAME", "qwen/qwen3.8-27b")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./trustagent.db")
    KB_DIR: str = os.getenv("KB_DIR", "./backend/data/kb")
    CALIBRATOR_PATH: str = os.getenv("CALIBRATOR_PATH", "./eval/results/calibrator.joblib")
    
    # Search provider API keys
    TAVILY_API_KEY: str = os.getenv("TAVILY_API_KEY", "")
    BRAVE_API_KEY: str = os.getenv("BRAVE_API_KEY", "")
    BING_API_KEY: str = os.getenv("BING_API_KEY", "")
    SERPAPI_API_KEY: str = os.getenv("SERPAPI_API_KEY", "")
    
    # Router thresholds
    HIGH_THRESHOLD: float = 0.85
    MEDIUM_THRESHOLD: float = 0.65
    LOW_THRESHOLD: float = 0.45
    VERY_LOW_THRESHOLD: float = 0.30
    
    # Confidence scorer weights (sum to 1.0)
    WEIGHT_CONSISTENCY: float = 0.35
    WEIGHT_EVIDENCE: float = 0.30
    WEIGHT_VERBALIZED: float = 0.20
    WEIGHT_REASONING: float = 0.15
    
    # Execution
    MAX_ROUTING_LOOPS: int = 3
    DRIFT_ECE_THRESHOLD: float = 0.10

settings = Settings()
