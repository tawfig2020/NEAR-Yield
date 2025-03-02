import praw
from typing import Dict, List, Optional
import logging
from datetime import datetime, timedelta
import asyncio
from nltk.sentiment import SentimentIntensityAnalyzer
from ..config import settings

logger = logging.getLogger(__name__)

class RedditClient:
    def __init__(self):
        self.reddit = praw.Reddit(
            client_id=settings.REDDIT_CLIENT_ID,
            client_secret=settings.REDDIT_CLIENT_SECRET,
            user_agent=settings.REDDIT_USER_AGENT
        )
        self.sia = SentimentIntensityAnalyzer()
        self.subreddits = ["NEAR", "cryptocurrency", "ethfinance"]
        self.cache = {}
        self.cache_ttl = 3600  # 1 hour

    async def get_near_sentiment(self) -> Optional[float]:
        """Get NEAR-related sentiment from Reddit."""
        try:
            # Check cache first
            cache_key = f"reddit_sentiment_{datetime.now().strftime('%Y%m%d%H')}"
            if cache_key in self.cache:
                return self.cache[cache_key]

            # Collect posts and comments
            posts = await self._collect_posts()
            if not posts:
                return None

            # Calculate sentiment
            sentiment_scores = []
            total_weight = 0

            for post in posts:
                # Calculate base sentiment
                text = f"{post['title']} {post['selftext']}"
                sentiment = self.sia.polarity_scores(text)
                base_score = sentiment['compound']  # -1 to 1 range

                # Calculate post weight based on engagement
                weight = self._calculate_post_weight(post)
                
                sentiment_scores.append(base_score * weight)
                total_weight += weight

            if total_weight == 0:
                return None

            # Calculate weighted average and normalize to 0-1 range
            final_score = sum(sentiment_scores) / total_weight
            normalized_score = (final_score + 1) / 2

            # Cache the result
            self.cache[cache_key] = normalized_score
            return normalized_score

        except Exception as e:
            logger.error(f"Error calculating Reddit sentiment: {e}")
            return None

    async def _collect_posts(self) -> List[Dict]:
        """Collect relevant posts from specified subreddits."""
        try:
            posts = []
            for subreddit in self.subreddits:
                # Run Reddit API calls in a thread pool
                loop = asyncio.get_event_loop()
                subreddit_posts = await loop.run_in_executor(
                    None,
                    self._get_subreddit_posts,
                    subreddit
                )
                posts.extend(subreddit_posts)
            return posts
        except Exception as e:
            logger.error(f"Error collecting Reddit posts: {e}")
            return []

    def _get_subreddit_posts(self, subreddit_name: str) -> List[Dict]:
        """Get posts from a specific subreddit."""
        posts = []
        try:
            subreddit = self.reddit.subreddit(subreddit_name)
            # Combine hot and new posts
            for post in subreddit.hot(limit=25):
                if self._is_relevant_post(post):
                    posts.append({
                        'title': post.title,
                        'selftext': post.selftext,
                        'score': post.score,
                        'num_comments': post.num_comments,
                        'created_utc': post.created_utc,
                        'subreddit': subreddit_name
                    })
            
            for post in subreddit.new(limit=25):
                if self._is_relevant_post(post):
                    posts.append({
                        'title': post.title,
                        'selftext': post.selftext,
                        'score': post.score,
                        'num_comments': post.num_comments,
                        'created_utc': post.created_utc,
                        'subreddit': subreddit_name
                    })
        except Exception as e:
            logger.error(f"Error fetching posts from r/{subreddit_name}: {e}")
        
        return posts

    def _is_relevant_post(self, post) -> bool:
        """Check if post is relevant to NEAR Protocol."""
        relevant_keywords = [
            'near', 'near protocol', '$near', 'nearprotocol',
            'aurora', 'near defi', 'near ecosystem'
        ]
        
        text = f"{post.title.lower()} {post.selftext.lower()}"
        return any(keyword in text for keyword in relevant_keywords)

    def _calculate_post_weight(self, post: Dict) -> float:
        """Calculate post weight based on engagement metrics."""
        # Base weight
        weight = 1.0

        # Adjust based on score (upvotes)
        weight += min(post['score'] / 100, 2.0)  # Max 2x boost from score

        # Adjust based on comments
        weight += min(post['num_comments'] / 50, 1.5)  # Max 1.5x boost from comments

        # Adjust based on recency
        hours_old = (datetime.now().timestamp() - post['created_utc']) / 3600
        if hours_old <= 6:  # Posts under 6 hours old
            weight *= 1.5
        elif hours_old <= 12:  # Posts under 12 hours old
            weight *= 1.25

        # Adjust based on subreddit
        if post['subreddit'] == 'NEAR':
            weight *= 1.3  # 30% boost for NEAR-specific subreddit

        return weight

    def close(self):
        """Clean up resources."""
        pass  # PRAW handles its own cleanup
