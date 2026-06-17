from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "TrustPulse"
    DATABASE_URL: str = "sqlite:///./trustpulse.db"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    AUTO_GENERATE_INTERVAL: float = 3.0
    MAX_SESSIONS: int = 50

    model_config = {"env_prefix": "TP_"}


settings = Settings()
