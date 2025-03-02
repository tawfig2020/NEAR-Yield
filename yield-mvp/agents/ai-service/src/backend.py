from fastapi import FastAPI, WebSocket, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.openapi.utils import get_openapi
import uvicorn
from .database.db import db
from .utils.logger import logger, log_error
from .routes import health
from .middleware.security import RateLimitMiddleware, get_current_user
from .config import settings
from langchain.llms import HuggingFacePipeline
from transformers import pipeline, AutoModelForSequenceClassification, AutoTokenizer
import near_api_py
from typing import List, Dict, Optional
import asyncio
import json
import os
from datetime import datetime, timedelta
import aiohttp
import pandas as pd
from pydantic import BaseModel, validator
from prometheus_client import Counter, Histogram
import motor.motor_asyncio
from .config import settings
from .middleware.security import (
    RateLimitMiddleware,
    get_current_user,
    log_request
)

# Initialize metrics
REQUEST_COUNT = Counter('http_requests_total', 'Total HTTP requests')
REQUEST_LATENCY = Histogram('http_request_duration_seconds', 'HTTP request latency')
WEBSOCKET_CONNECTIONS = Counter('websocket_connections_total', 'Total WebSocket connections')

# Initialize MongoDB
client = motor.motor_asyncio.AsyncIOMotorClient(settings.MONGODB_URL)
db = client[settings.DATABASE_NAME]

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    debug=settings.DEBUG,
    docs_url="/api/v1/docs",
    redoc_url="/api/v1/redoc",
    openapi_url="/api/v1/openapi.json"
)

# Enable CORS with specific origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add rate limiting
app.add_middleware(RateLimitMiddleware)

# Include routers
app.include_router(health.router, prefix="/api/v1", tags=["health"])

# Request validation models
class SentimentRequest(BaseModel):
    text: str
    
    @validator('text')
    def text_must_not_be_empty(cls, v):
        if not v.strip():
            raise ValueError('Text must not be empty')
        return v

class WebSocketMessage(BaseModel):
    message_type: str
    content: dict

    @validator('message_type')
    def validate_message_type(cls, v):
        allowed_types = ['sentiment_analysis', 'strategy_update']
        if v not in allowed_types:
            raise ValueError(f'Message type must be one of {allowed_types}')
        return v

# Initialize NEAR client with error handling
try:
    near_client = near_api_py.connect(
        node_url=settings.NEAR_NODE_URL,
        wallet_url=settings.NEAR_WALLET_URL,
        contract_name=settings.CONTRACT_ID
    )
except Exception as e:
    logger.error(f"Failed to initialize NEAR client: {e}")
    raise

# Initialize sentiment model with crypto-specific fine-tuning
model_name = "ProsusAI/finbert"  # Financial sentiment model
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSequenceClassification.from_pretrained(model_name)
sentiment_pipeline = pipeline("sentiment-analysis", model=model, tokenizer=tokenizer)

# Initialize LangChain
llm = HuggingFacePipeline(pipeline=sentiment_pipeline)

# Store historical data
historical_data = []

class SentimentAnalyzer:
    def __init__(self):
        self.threshold_bullish = 0.7
        self.threshold_bearish = 0.3
        
    async def analyze_text(self, texts: List[str]) -> Dict:
        sentiments = []
        for text in texts:
            result = sentiment_pipeline(text)[0]
            sentiments.append({
                'text': text,
                'sentiment': result['label'],
                'score': result['score']
            })
        
        avg_score = sum(s['score'] for s in sentiments) / len(sentiments)
        return {
            'detailed_sentiments': sentiments,
            'average_score': avg_score,
            'timestamp': datetime.now().isoformat()
        }

    def should_update_contract(self, sentiment_score: float) -> bool:
        return sentiment_score > self.threshold_bullish or sentiment_score < self.threshold_bearish

analyzer = SentimentAnalyzer()

@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    user: str = Depends(get_current_user)
):
    WEBSOCKET_CONNECTIONS.inc()
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = WebSocketMessage.parse_raw(data)
                analysis = await analyzer.analyze_text([message.content.get('text', '')])
                
                # Store in database
                await db.sentiment_analysis.insert_one({
                    'user': user,
                    'analysis': analysis,
                    'timestamp': datetime.utcnow()
                })
                
                await websocket.send_json(analysis)
                
                if analyzer.should_update_contract(analysis['average_score']):
                    await update_near_contract(analysis)
            except ValueError as e:
                await websocket.send_json({'error': str(e)})
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        try:
            await websocket.close()
        except:
            pass

@app.get("/api/v1/historical-data")
async def get_historical_data(
    user: str = Depends(get_current_user),
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
):
    """Get historical sentiment data for visualization"""
    query = {'user': user}
    if start_date:
        query['timestamp'] = {'$gte': start_date}
    if end_date:
        query['timestamp'] = {'$lte': end_date}
    
    cursor = db.sentiment_analysis.find(query).sort('timestamp', -1)
    return await cursor.to_list(length=100)

@app.post("/analyze-batch")
async def analyze_batch(data: Dict[str, List[str]]):
    """Analyze a batch of tweets"""
    try:
        analysis = await analyzer.analyze_text(data['texts'])
        historical_data.append(analysis)
        
        # Keep only last 24 hours of data
        cutoff = datetime.now() - timedelta(hours=24)
        global historical_data
        historical_data = [d for d in historical_data 
                          if datetime.fromisoformat(d['timestamp']) > cutoff]
        
        if analyzer.should_update_contract(analysis['average_score']):
            await update_near_contract(analysis)
            
        return analysis
    except Exception as e:
        return {"error": str(e)}

async def update_near_contract(analysis: Dict):
    try:
        method = "increase_risk_exposure" if analysis['average_score'] > analyzer.threshold_bullish else "decrease_risk_exposure"
        await near_client.call_function(
            method,
            json.dumps({"sentiment_score": analysis['average_score']})
        )
    except Exception as e:
        print(f"Error updating NEAR contract: {e}")

@app.middleware("http")
async def add_metrics(request: Request, call_next):
    REQUEST_COUNT.inc()
    start_time = time.time()
    response = await call_next(request)
    REQUEST_LATENCY.observe(time.time() - start_time)
    return response

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    logger.error(f"HTTP error occurred: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unexpected error occurred: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    try:
        # Connect to database
        await db.connect()
        logger.info("Application startup completed successfully")
    except Exception as e:
        log_error(logger, e, "Application startup failed")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    try:
        # Close database connections
        await db.close()
        logger.info("Application shutdown completed successfully")
    except Exception as e:
        log_error(logger, e, "Application shutdown failed")

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        description="""
        NEAR Deep Yield API
        
        This API provides endpoints for:
        * Sentiment Analysis
        * Strategy Performance Tracking
        * Health Monitoring
        * Historical Data Analysis
        
        For detailed documentation of each endpoint, see the routes below.
        """,
        routes=app.routes,
    )
    
    # Add security schemes
    openapi_schema["components"]["securitySchemes"] = {
        "bearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        }
    }
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

if __name__ == "__main__":
    uvicorn.run(
        "backend:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )
