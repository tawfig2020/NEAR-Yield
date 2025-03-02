from typing import Dict, Optional
import logging
from datetime import datetime
import json
from .twitter_client import TwitterClient
from .santiment_client import SantimentClient
from .reddit_client import RedditClient
from .cryptopanic_client import CryptoPanicClient
from ..config import settings

logger = logging.getLogger(__name__)

class SentimentAggregator:
    def __init__(self):
        self.twitter_client = TwitterClient(settings.TWITTER_API_KEY)
        self.santiment_client = SantimentClient(settings.SANTIMENT_API_KEY)
        self.reddit_client = RedditClient()
        self.cryptopanic_client = CryptoPanicClient(settings.CRYPTOPANIC_API_KEY)
        
        # Default weights
        self.weights = {
            'twitter': 0.40,
            'santiment': 0.35,
            'reddit': 0.25
        }

    def set_weights(self, weights: Dict[str, float]):
        """Allow users to customize source weights."""
        total = sum(weights.values())
        if abs(total - 1.0) > 0.001:  # Allow small floating-point differences
            raise ValueError("Weights must sum to 1.0")
        self.weights = weights

    async def get_composite_sentiment(self) -> Dict:
        """Get composite sentiment score from all sources."""
        try:
            # Collect sentiment from all sources
            twitter_score = await self.twitter_client.get_sentiment()
            santiment_score = await self.santiment_client.calculate_sentiment_score()
            reddit_score = await self.reddit_client.get_near_sentiment()

            # Handle missing data
            if twitter_score is None:
                twitter_score = await self.cryptopanic_client.get_near_sentiment()
                logger.warning("Using CryptoPanic as Twitter fallback")

            scores = {
                'twitter': twitter_score,
                'santiment': santiment_score,
                'reddit': reddit_score
            }

            # Filter out None values and adjust weights
            valid_scores = {k: v for k, v in scores.items() if v is not None}
            if not valid_scores:
                raise ValueError("No valid sentiment scores available")

            # Normalize weights for available scores
            total_weight = sum(self.weights[k] for k in valid_scores.keys())
            normalized_weights = {
                k: self.weights[k] / total_weight for k in valid_scores.keys()
            }

            # Calculate composite score
            composite_score = sum(
                score * normalized_weights[source]
                for source, score in valid_scores.items()
            )

            # Prepare detailed response
            response = {
                'composite_score': composite_score,
                'source_scores': scores,
                'weights_used': normalized_weights,
                'timestamp': datetime.utcnow().isoformat(),
                'confidence': self._calculate_confidence(valid_scores)
            }

            # Add market signals
            response['market_signals'] = await self._analyze_market_signals(valid_scores)

            return response

        except Exception as e:
            logger.error(f"Error calculating composite sentiment: {e}")
            return {
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }

    def _calculate_confidence(self, valid_scores: Dict[str, float]) -> float:
        """Calculate confidence level based on available data sources."""
        # Base confidence on number and quality of available sources
        source_weights = {
            'twitter': 0.4,    # Real-time, high volume
            'santiment': 0.4,  # On-chain data, high quality
            'reddit': 0.2      # Slower but detailed
        }
        
        confidence = sum(
            source_weights[source]
            for source in valid_scores.keys()
        )
        
        return min(confidence, 1.0)  # Cap at 1.0

    async def _analyze_market_signals(self, scores: Dict[str, float]) -> Dict:
        """Analyze market signals from sentiment data."""
        signals = {
            'trend': 'neutral',
            'strength': 'normal',
            'warnings': []
        }

        # Detect extreme sentiment
        if any(score <= 0.2 for score in scores.values()):
            signals['warnings'].append('extreme_fear')
        elif any(score >= 0.8 for score in scores.values()):
            signals['warnings'].append('extreme_greed')

        # Detect sentiment divergence
        if len(scores) >= 2:
            values = list(scores.values())
            divergence = max(values) - min(values)
            if divergence > 0.4:  # 40% divergence threshold
                signals['warnings'].append('high_divergence')

        # Set trend
        avg_sentiment = sum(scores.values()) / len(scores)
        if avg_sentiment < 0.4:
            signals['trend'] = 'bearish'
        elif avg_sentiment > 0.6:
            signals['trend'] = 'bullish'

        # Set strength
        if len(signals['warnings']) == 0:
            signals['strength'] = 'strong'
        elif len(signals['warnings']) >= 2:
            signals['strength'] = 'weak'

        return signals

    async def close(self):
        """Close all client connections."""
        await self.twitter_client.close()
        await self.santiment_client.close()
        self.reddit_client.close()
        await self.cryptopanic_client.close()
