from typing import List, Dict
import aiohttp
import asyncio
from datetime import datetime
import os
from dotenv import load_dotenv
from masa import MasaClient  # Assuming Masa SDK is available

class TwitterDataService:
    def __init__(self):
        load_dotenv()
        self.masa_client = MasaClient(
            api_key=os.getenv("MASA_API_KEY"),
            environment="testnet"
        )
        
    async def fetch_twitter_data(self, keywords: List[str]) -> List[Dict]:
        """Fetch Twitter data using Masa's decentralized identity system"""
        try:
            # Use Masa's Twitter data API
            twitter_data = await self.masa_client.query_twitter({
                "keywords": keywords,
                "limit": 100,
                "include_metrics": True
            })
            
            return self._process_twitter_data(twitter_data)
        except Exception as e:
            print(f"Error fetching Twitter data via Masa: {e}")
            # Fallback to web scraping if Masa fails
            return await self._fallback_scraping(keywords)
    
    def _process_twitter_data(self, raw_data: List[Dict]) -> List[Dict]:
        """Process and normalize Twitter data"""
        processed_data = []
        
        for tweet in raw_data:
            processed_data.append({
                "text": tweet.get("text", ""),
                "created_at": tweet.get("created_at", datetime.now().isoformat()),
                "user": tweet.get("user", {}).get("screen_name", "unknown"),
                "metrics": {
                    "likes": tweet.get("favorite_count", 0),
                    "retweets": tweet.get("retweet_count", 0)
                }
            })
        
        return processed_data
    
    async def _fallback_scraping(self, keywords: List[str]) -> List[Dict]:
        """Fallback method using web scraping"""
        from agent_twitter_client import TwitterClient
        
        client = TwitterClient()
        tweets = []
        
        for keyword in keywords:
            try:
                keyword_tweets = client.search(keyword, limit=100)
                tweets.extend(keyword_tweets)
            except Exception as e:
                print(f"Error scraping tweets for {keyword}: {e}")
                continue
        
        return self._process_twitter_data(tweets)
    
    async def stream_tweets(self, keywords: List[str], callback):
        """Stream tweets in real-time"""
        while True:
            try:
                tweets = await self.fetch_twitter_data(keywords)
                await callback(tweets)
                await asyncio.sleep(60)  # Rate limiting
            except Exception as e:
                print(f"Error in tweet stream: {e}")
                await asyncio.sleep(300)  # Longer delay on error
