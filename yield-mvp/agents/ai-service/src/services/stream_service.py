from typing import Dict, List, Optional
import asyncio
import websockets
import json
import redis
from datetime import datetime
import logging
from ..config import settings
from .sentiment_analyzer import SentimentAnalyzer
from .cryptopanic_client import CryptoPanicClient

logger = logging.getLogger(__name__)

class DataStreamService:
    def __init__(self):
        self.redis_client = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            decode_responses=True
        )
        self.sentiment_analyzer = SentimentAnalyzer()
        self.cryptopanic = CryptoPanicClient(settings.CRYPTOPANIC_API_KEY)
        self.cache_ttl = 300  # 5 minutes
        self.min_tweets_threshold = 50
        self.price_volatility_threshold = 0.05  # 5%
        
    async def start_twitter_stream(self):
        """Start Twitter filtered stream for NEAR-related tweets."""
        try:
            async with websockets.connect(settings.TWITTER_STREAM_URL) as websocket:
                while True:
                    tweet = await websocket.recv()
                    await self.process_tweet(json.loads(tweet))
        except Exception as e:
            logger.error(f"Twitter stream error: {e}")
            await self.fallback_to_cryptopanic()

    async def process_tweet(self, tweet: Dict):
        """Process incoming tweet and update sentiment cache."""
        try:
            # Add tweet to current window
            window_key = f"sentiment:window:{datetime.now().strftime('%Y%m%d%H%M')}"
            self.redis_client.lpush(window_key, json.dumps(tweet))
            self.redis_client.expire(window_key, self.cache_ttl)

            # Check if we have enough tweets
            tweets_count = self.redis_client.llen(window_key)
            if tweets_count >= self.min_tweets_threshold:
                await self.update_sentiment()
            else:
                logger.warning(f"Insufficient tweets ({tweets_count}/{self.min_tweets_threshold})")
                await self.fallback_to_cryptopanic()

        except Exception as e:
            logger.error(f"Error processing tweet: {e}")

    async def update_sentiment(self):
        """Calculate and update sentiment score."""
        try:
            # Get all tweets from current window
            window_key = f"sentiment:window:{datetime.now().strftime('%Y%m%d%H%M')}"
            tweets = self.redis_client.lrange(window_key, 0, -1)
            
            if not tweets:
                return await self.fallback_to_cryptopanic()

            # Calculate sentiment
            tweets_text = [json.loads(tweet)['text'] for tweet in tweets]
            sentiment_score = await self.sentiment_analyzer.analyze_batch(tweets_text)
            
            # Store sentiment score
            self.redis_client.set(
                'current_sentiment',
                sentiment_score,
                ex=self.cache_ttl
            )

            # Check for panic conditions
            if sentiment_score <= 0.25:  # Bearish threshold
                await self.handle_bearish_sentiment(sentiment_score)
            elif sentiment_score >= 0.75:  # Bullish threshold
                await self.handle_bullish_sentiment(sentiment_score)

        except Exception as e:
            logger.error(f"Error updating sentiment: {e}")
            await self.fallback_to_cryptopanic()

    async def fallback_to_cryptopanic(self):
        """Use CryptoPanic as fallback data source."""
        try:
            news_sentiment = await self.cryptopanic.get_near_sentiment()
            historical_avg = float(self.redis_client.get('historical_sentiment') or 0.5)
            
            # Weighted average of news and historical data
            combined_sentiment = (news_sentiment * 0.7) + (historical_avg * 0.3)
            
            self.redis_client.set(
                'current_sentiment',
                combined_sentiment,
                ex=self.cache_ttl
            )
            
            return combined_sentiment
        except Exception as e:
            logger.error(f"Fallback error: {e}")
            return None

    async def handle_bearish_sentiment(self, score: float):
        """Handle bearish sentiment conditions."""
        try:
            # Verify with additional data sources
            news_sentiment = await self.cryptopanic.get_near_sentiment()
            
            if news_sentiment and news_sentiment <= 0.25:
                # Confirmed bearish signal
                await self.trigger_defensive_action(score)
            else:
                logger.info("Bearish signal not confirmed by news data")
                
        except Exception as e:
            logger.error(f"Error handling bearish sentiment: {e}")

    async def handle_bullish_sentiment(self, score: float):
        """Handle bullish sentiment conditions."""
        try:
            # Verify with additional data sources
            news_sentiment = await self.cryptopanic.get_near_sentiment()
            
            if news_sentiment and news_sentiment >= 0.75:
                # Confirmed bullish signal
                await self.trigger_aggressive_action(score)
            else:
                logger.info("Bullish signal not confirmed by news data")
                
        except Exception as e:
            logger.error(f"Error handling bullish sentiment: {e}")

    async def trigger_defensive_action(self, sentiment_score: float):
        """Trigger defensive portfolio actions."""
        try:
            # Call smart contract to adjust strategy
            contract_call = {
                "method": "handle_twitter_sentiment",
                "args": {"sentiment": sentiment_score},
                "action": "defensive"
            }
            await self.notify_contract(contract_call)
            
        except Exception as e:
            logger.error(f"Error triggering defensive action: {e}")

    async def trigger_aggressive_action(self, sentiment_score: float):
        """Trigger aggressive portfolio actions."""
        try:
            # Call smart contract to adjust strategy
            contract_call = {
                "method": "handle_twitter_sentiment",
                "args": {"sentiment": sentiment_score},
                "action": "aggressive"
            }
            await self.notify_contract(contract_call)
            
        except Exception as e:
            logger.error(f"Error triggering aggressive action: {e}")

    async def notify_contract(self, call_data: Dict):
        """Notify smart contract of sentiment changes."""
        # Implementation of contract notification
        pass
