from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "Universal AI Guardrail API"
    VERSION: str = "1.0.0-phase1"
    API_V1_STR: str = "/api/v1"
    
    # Decision Engine Configurable Thresholds
    # LOW: 0.00 - 0.40 -> ALLOW
    # MEDIUM: 0.40 - 0.70 -> WARN
    # HIGH: 0.70 - 1.00 -> BLOCK
    RISK_THRESHOLD_LOW: float = 0.40
    RISK_THRESHOLD_HIGH: float = 0.70
    
    # Operation & Demonstration Modes
    DEMO_MODE: bool = False
    SEED_DEMO_DATA: bool = False
    
    # AI Provider Integration
    AI_PROVIDER: str = "demo"  # "demo", "openai", "gemini"
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:8000",
        "http://localhost:8000"
    ]
    
    # Database
    DATABASE_URL: str = "sqlite:///./guardrail.db"

    # Authentication & Security
    JWT_SECRET: str = "ai_guardrail_super_secret_jwt_key_2026_production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    API_KEY_SECRET: str = "ai_guardrail_master_api_key_secret_2026"

    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env", extra="ignore")

settings = Settings()
