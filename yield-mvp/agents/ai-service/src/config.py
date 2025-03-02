from pydantic import BaseSettings
from typing import List
import os
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    # API Settings
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "NEAR Deep Yield"
    DEBUG: bool = False
    VERSION: str = "1.0.0"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",  # Development
        "https://your-production-domain.com",  # Production
        os.getenv("FRONTEND_URL", ""),  # Dynamic frontend URL
    ]
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    
    # Database
    MONGODB_URL: str = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "near_deep_yield")
    
    # NEAR Settings
    NEAR_NODE_URL: str = os.getenv("NEAR_NODE_URL", "https://rpc.testnet.near.org")
    NEAR_WALLET_URL: str = os.getenv("NEAR_WALLET_URL")
    CONTRACT_ID: str = os.getenv("CONTRACT_ID")
    
    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    # AI Model Settings
    BERT_MODEL: str = "bert-base-uncased"  # Will be fine-tuned on crypto data
    
    # API Keys and Endpoints
    TWITTER_API_KEY: str = os.getenv("TWITTER_API_KEY", "")
    TWITTER_STREAM_URL: str = "wss://api.twitter.com/2/tweets/search/stream"
    CRYPTOPANIC_API_KEY: str = os.getenv("CRYPTOPANIC_API_KEY", "")
    
    # Redis Configuration
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    
    # Sentiment Analysis Parameters
    SCRAPING_INTERVAL_VOLATILE: int = 300  # 5 minutes
    SCRAPING_INTERVAL_STABLE: int = 3600   # 1 hour
    MIN_TWEETS_THRESHOLD: int = 50
    SENTIMENT_BEARISH_THRESHOLD: float = 0.25
    SENTIMENT_BULLISH_THRESHOLD: float = 0.75
    PRICE_VOLATILITY_THRESHOLD: float = 0.05  # 5%
    
    # Smart Contract Configuration
    NEAR_NETWORK_ID: str = os.getenv("NEAR_NETWORK_ID", "testnet")
    NEAR_CONTRACT_ID: str = os.getenv("NEAR_CONTRACT_ID", "")
    NEAR_ACCOUNT_ID: str = os.getenv("NEAR_ACCOUNT_ID", "")
    
    # Reddit Configuration
    REDDIT_CLIENT_ID: str = os.getenv("REDDIT_CLIENT_ID", "")
    REDDIT_CLIENT_SECRET: str = os.getenv("REDDIT_CLIENT_SECRET", "")
    REDDIT_USER_AGENT: str = "NEAR_Yield_Bot/1.0"
    
    # Santiment Configuration
    SANTIMENT_API_KEY: str = os.getenv("SANTIMENT_API_KEY", "")
    
    # Sentiment Analysis Weights
    SENTIMENT_WEIGHTS = {
        "twitter": 0.40,
        "santiment": 0.35,
        "reddit": 0.25
    }
    
    # Sentiment Thresholds
    EXTREME_FEAR_THRESHOLD: float = 0.2
    EXTREME_GREED_THRESHOLD: float = 0.8
    SENTIMENT_DIVERGENCE_THRESHOLD: float = 0.4
    
    # Cache Settings
    REDDIT_CACHE_TTL: int = 3600  # 1 hour
    SANTIMENT_CACHE_TTL: int = 3600  # 1 hour
    
    # Rate Limiting
    REDDIT_RATE_LIMIT: int = 60  # requests per minute
    SANTIMENT_RATE_LIMIT: int = 300  # requests per minute
    
    # Regulatory Compliance
    DISCLAIMER: str = """
    This is an experimental AI-driven yield optimization service.
    The signals and recommendations provided are based on social sentiment analysis
    and should not be considered as financial advice. Always do your own research
    before making investment decisions.
    """

    class Config:
        case_sensitive = True

settings = Settings()
