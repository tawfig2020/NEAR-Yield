from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
from typing import List, Dict
import numpy as np
from ..config import settings
import logging

logger = logging.getLogger(__name__)

class SentimentAnalyzer:
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.tokenizer = AutoTokenizer.from_pretrained(settings.BERT_MODEL)
        self.model = AutoModelForSequenceClassification.from_pretrained(
            settings.BERT_MODEL
        ).to(self.device)
        self.model.eval()
        
        # Load crypto-specific vocabulary
        self.crypto_terms = self._load_crypto_terms()

    def _load_crypto_terms(self) -> Dict[str, float]:
        """Load crypto-specific terms and their sentiment weights."""
        return {
            "hack": -0.8,
            "security breach": -0.9,
            "partnership": 0.6,
            "adoption": 0.7,
            "integration": 0.5,
            "upgrade": 0.4,
            "vulnerability": -0.7,
            "scam": -0.9,
            "mainnet": 0.6,
            "launch": 0.5
        }

    async def analyze_batch(self, texts: List[str]) -> float:
        """Analyze sentiment for a batch of texts."""
        try:
            # Preprocess texts
            processed_texts = [self._preprocess_text(text) for text in texts]
            
            # Tokenize
            inputs = self.tokenizer(
                processed_texts,
                return_tensors="pt",
                padding=True,
                truncation=True,
                max_length=512
            ).to(self.device)
            
            # Get model predictions
            with torch.no_grad():
                outputs = self.model(**inputs)
                predictions = torch.softmax(outputs.logits, dim=1)
                
            # Convert to sentiment scores (0 to 1)
            sentiment_scores = predictions[:, 1].cpu().numpy()
            
            # Apply crypto-specific adjustments
            adjusted_scores = [
                self._adjust_score_with_crypto_terms(text, score)
                for text, score in zip(texts, sentiment_scores)
            ]
            
            # Calculate final sentiment
            final_sentiment = np.mean(adjusted_scores)
            
            return float(final_sentiment)

        except Exception as e:
            logger.error(f"Error in sentiment analysis: {e}")
            return 0.5  # Neutral sentiment as fallback

    def _preprocess_text(self, text: str) -> str:
        """Preprocess text for sentiment analysis."""
        # Remove URLs
        text = re.sub(r'http\S+|www.\S+', '', text, flags=re.MULTILINE)
        
        # Remove mentions
        text = re.sub(r'@\w+', '', text)
        
        # Remove hashtags but keep the text
        text = re.sub(r'#', '', text)
        
        # Remove extra whitespace
        text = ' '.join(text.split())
        
        return text

    def _adjust_score_with_crypto_terms(self, text: str, base_score: float) -> float:
        """Adjust sentiment score based on crypto-specific terms."""
        adjustment = 0.0
        text_lower = text.lower()
        
        # Check for crypto terms
        for term, weight in self.crypto_terms.items():
            if term in text_lower:
                adjustment += weight
        
        # Apply adjustment with dampening
        final_score = base_score + (adjustment * 0.3)  # 30% influence from crypto terms
        
        # Ensure score stays in [0, 1] range
        return max(0.0, min(1.0, final_score))

    async def analyze_single(self, text: str) -> float:
        """Analyze sentiment for a single text."""
        return await self.analyze_batch([text])
