from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://tickets:tickets_dev@localhost:5432/tickets"
    REDIS_URL: str = "redis://localhost:6379/0"

    SECRET_KEY: str = "change-me"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    STRIPE_SECRET_KEY: str = ""
    STRIPE_PUBLISHABLE_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    APPLICATION_FEE_PERCENT: float = 5.0

    FRONTEND_URL: str = "http://localhost:3000"

    RESEND_API_KEY: str = ""
    FROM_EMAIL: str = "hello@pulsetix.net"

    S3_BUCKET_NAME: str = ""
    S3_ENDPOINT_URL: str = ""
    S3_ACCESS_KEY_ID: str = ""
    S3_SECRET_ACCESS_KEY: str = ""
    S3_PUBLIC_URL: str = ""

    model_config = {"env_file": ["../.env", ".env"], "extra": "ignore"}


settings = Settings()
