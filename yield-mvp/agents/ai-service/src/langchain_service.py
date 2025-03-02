from langchain.chains import LLMChain
from langchain.llms import HuggingFacePipeline
from transformers import pipeline
import near_api_py
import os
from dotenv import load_dotenv
from typing import List, Dict
import asyncio
import json

class YieldOptimizer:
    def __init__(self):
        load_dotenv()
        
        # Initialize HuggingFace sentiment pipeline
        self.sentiment_pipeline = pipeline(
            "sentiment-analysis",
            model="ProsusAI/finbert"  # Financial sentiment model
        )
        
        # Initialize LangChain
        self.llm = HuggingFacePipeline(pipeline=self.sentiment_pipeline)
        self.chain = LLMChain(
            llm=self.llm,
            prompt_template="Analyze the market sentiment: {text}"
        )
        
        # Initialize NEAR client
        self.near_client = near_api_py.connect(
            node_url=os.getenv("NEAR_NODE_URL", "https://rpc.testnet.near.org"),
            wallet_url=os.getenv("NEAR_WALLET_URL"),
            contract_name=os.getenv("CONTRACT_ID")
        )

    async def analyze_market_sentiment(self, tweets: List[Dict]) -> Dict:
        """Analyze market sentiment from multiple sources"""
        sentiments = []
        
        for tweet in tweets:
            try:
                sentiment = self.chain.run(tweet["text"])
                sentiments.append({
                    "text": tweet["text"],
                    "sentiment": sentiment,
                    "confidence": sentiment["score"]
                })
            except Exception as e:
                print(f"Error analyzing tweet: {e}")
                continue
        
        # Aggregate sentiments
        avg_sentiment = sum(s["confidence"] for s in sentiments) / len(sentiments)
        
        return {
            "overall_sentiment": avg_sentiment,
            "detailed_analysis": sentiments,
            "recommendation": self._generate_recommendation(avg_sentiment)
        }

    def _generate_recommendation(self, sentiment_score: float) -> str:
        """Generate trading recommendation based on sentiment"""
        if sentiment_score > 0.7:
            return "BULLISH: Consider increasing exposure"
        elif sentiment_score < 0.3:
            return "BEARISH: Consider reducing exposure"
        else:
            return "NEUTRAL: Maintain current position"

    async def update_contract_state(self, sentiment_data: Dict):
        """Update smart contract based on sentiment analysis"""
        try:
            if sentiment_data["overall_sentiment"] > 0.7:
                await self.near_client.call_function(
                    "increase_risk_exposure",
                    json.dumps({"sentiment_score": sentiment_data["overall_sentiment"]})
                )
            elif sentiment_data["overall_sentiment"] < 0.3:
                await self.near_client.call_function(
                    "decrease_risk_exposure",
                    json.dumps({"sentiment_score": sentiment_data["overall_sentiment"]})
                )
        except Exception as e:
            print(f"Error updating contract state: {e}")

    async def process_twitter_stream(self, tweets: List[Dict]):
        """Process incoming Twitter stream"""
        sentiment_data = await self.analyze_market_sentiment(tweets)
        await self.update_contract_state(sentiment_data)
        return sentiment_data
