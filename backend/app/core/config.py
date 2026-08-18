from pathlib import Path
from pydantic import Field,computed_field,EmailStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Load .env automatically
    model_config = SettingsConfigDict(
        env_file=Path(__file__).parent.parent.parent / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ------------------------
    # Paths
    # ------------------------

    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    ARTIFACT_PATH: Path = BASE_DIR / "models" / "aqi_artifact.pkl"

    # ------------------------
    # API
    # ------------------------

    API_VERSION: str = "v1"
    API_TITLE: str = "AQI Prediction API"

    # ------------------------
    # App Name
    # ------------------------
    APP_NAME: str = "BreatheCast"

    # ------------------------
    # Brevo api key and setup
    # ------------------------
    BREVO_API_KEY: str
    BREVO_SENDER_EMAIL: EmailStr
    OTP_EXPIRE_MINUTES: int = 5
    OTP_MAX_ATTEMPTS: int = 5

    # ------------------------
    # Messages
    # ------------------------

    ERROR_MESSAGE: str = "Something went wrong. Please try again later."

    SHORT_STR: int = 30
    LONG_STR: int = 255

    MAX_UPLOAD_SIZE_MB: int = 150

    # ------------------------
    # Database
    # ------------------------

    DATABASE_USER : str
    DATABASE_PASSWORD : str
    DATABASE_DB : str
    DATABASE_PORT : int = 5432
    DATABASE_HOST: str 

    @computed_field
    @property
    def DATABASE_URL(self)->str:
        return f"postgresql+psycopg://{self.DATABASE_USER}:{self.DATABASE_PASSWORD}@{self.DATABASE_HOST}:{self.DATABASE_PORT}/{self.DATABASE_DB}"

    TABLE_NAME_AUTH: str = "accounts"
    TABLE_NAME_HISTORY: str = "aqi_history"
    TABLE_NAME_REFRESH_TOKEN: str = "refresh_tokens"
    TABLE_NAME_UPLOADED_FILE: str = "uploaded_files"

    # ------------------------
    # Security
    # ------------------------

    SECRET_KEY: str

    ACCESS_TOKEN_EXPIRY_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRY_DAYS: int = 7

    # ------------------------
    # Google OAuth
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str

    # ------------------------
    # Environment
    # ------------------------

    DEBUG: bool = False
    ENVIRONMENT: str = "production"

    # ------------------------
    # CORS
    # ------------------------

    ALLOWED_ORIGINS: list[str] = Field(default_factory=lambda: ["*"])

    @property
    def IS_PROD(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"


settings = Settings()