import os
from pydantic_settings import BaseSettings
from typing import Dict

class Settings(BaseSettings):
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "mock")  # "mock", "gemini", "anthropic"
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    MODEL_NAME: str = os.getenv("MODEL_NAME", "gemini-2.5-flash")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./trustagent.db")
    KB_DIR: str = os.getenv("KB_DIR", "./backend/data/kb")
    CALIBRATOR_PATH: str = os.getenv("CALIBRATOR_PATH", "./eval/results/calibrator.joblib")
    
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
    
    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
