import aiohttp
from typing import Dict, List, Optional
import logging
from ..config import settings

logger = logging.getLogger(__name__)

class CryptoPanicClient:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://cryptopanic.com/api/v1"
        self.session = None

    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create aiohttp session."""
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession()
        return self.session

    async def get_near_news(self) -> List[Dict]:
        """Get NEAR Protocol related news from CryptoPanic."""
        try:
            session = await self._get_session()
            params = {
                "auth_token": self.api_key,
                "currencies": "near-protocol",
                "kind": "news",
                "filter": "important"
            }
            
            async with session.get(f"{self.base_url}/posts/", params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    return data.get("results", [])
                else:
                    logger.error(f"CryptoPanic API error: {response.status}")
                    return []
                    
        except Exception as e:
            logger.error(f"Error fetching news from CryptoPanic: {e}")
            return []

    async def get_near_sentiment(self) -> Optional[float]:
        """Calculate sentiment score from NEAR news."""
        try:
            news_items = await self.get_near_news()
            if not news_items:
                return None

            # Calculate sentiment based on votes and ratings
            total_score = 0
            total_weight = 0
            
            for item in news_items:
                # Get vote score (-1 to 1)
                vote_score = self._calculate_vote_score(item)
                
                # Get importance weight (1 to 3)
                importance = self._get_importance_weight(item)
                
                total_score += vote_score * importance
                total_weight += importance

            if total_weight == 0:
                return None

            # Normalize to 0-1 range
            normalized_score = (total_score / total_weight + 1) / 2
            return normalized_score

        except Exception as e:
            logger.error(f"Error calculating NEAR sentiment: {e}")
            return None

    def _calculate_vote_score(self, news_item: Dict) -> float:
        """Calculate vote-based score for a news item."""
        votes = news_item.get("votes", {})
        positive = votes.get("positive", 0)
        negative = votes.get("negative", 0)
        
        if positive + negative == 0:
            return 0
            
        return (positive - negative) / (positive + negative)

    def _get_importance_weight(self, news_item: Dict) -> int:
        """Get importance weight based on news metadata."""
        # Base importance
        importance = 1
        
        # Increase importance for verified sources
        if news_item.get("source", {}).get("verified", False):
            importance += 1
            
        # Increase importance for breaking news
        if news_item.get("is_breaking", False):
            importance += 1
            
        return importance

    async def close(self):
        """Close the aiohttp session."""
        if self.session and not self.session.closed:
            await self.session.close()
