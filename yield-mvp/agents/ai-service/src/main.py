from fastapi import FastAPI, BackgroundTasks
from langchain_service import YieldOptimizer
from twitter_service import TwitterDataService
import asyncio
import uvicorn
from typing import List, Dict
import os
from dotenv import load_dotenv

app = FastAPI()
load_dotenv()

# Initialize services
yield_optimizer = YieldOptimizer()
twitter_service = TwitterDataService()

# Track running tasks
background_tasks = set()

async def process_market_data(tweets: List[Dict]):
    """Process market data and update contract state"""
    sentiment_data = await yield_optimizer.process_twitter_stream(tweets)
    print(f"Processed sentiment data: {sentiment_data}")

@app.on_event("startup")
async def startup_event():
    """Start background tasks on server startup"""
    keywords = ["$NEAR", "NEAR Protocol", "NEARProtocol"]
    task = asyncio.create_task(
        twitter_service.stream_tweets(keywords, process_market_data)
    )
    background_tasks.add(task)
    task.add_done_callback(background_tasks.discard)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

@app.get("/sentiment")
async def get_current_sentiment():
    """Get current market sentiment"""
    keywords = ["$NEAR", "NEAR Protocol"]
    tweets = await twitter_service.fetch_twitter_data(keywords)
    sentiment_data = await yield_optimizer.analyze_market_sentiment(tweets)
    return sentiment_data

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "127.0.0.1"),
        port=int(os.getenv("PORT", 8000)),
        reload=True
    )
