"""
Sentiment Analysis Module for NEAR Deep Yield
Handles sentiment analysis of social media and news data
"""
import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer
import numpy as np

class SentimentAnalyzer:
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model_name = "finiteautomata/bertweet-base-sentiment-analysis"
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
        self.model = AutoModelForSequenceClassification.from_pretrained(self.model_name).to(self.device)
        
    def analyze_text(self, text):
        """
        Analyze sentiment of given text
        Returns: dict with sentiment scores (positive, negative, neutral)
        """
        inputs = self.tokenizer(text, return_tensors="pt", padding=True, truncation=True)
        inputs = {k: v.to(self.device) for k, v in inputs.items()}
        
        with torch.no_grad():
            outputs = self.model(**inputs)
            scores = torch.softmax(outputs.logits, dim=1)
            
        return {
            "positive": float(scores[0][2]),
            "neutral": float(scores[0][1]),
            "negative": float(scores[0][0])
        }
        
    def analyze_batch(self, texts):
        """
        Analyze sentiment for a batch of texts
        Returns: list of sentiment dictionaries
        """
        inputs = self.tokenizer(texts, return_tensors="pt", padding=True, truncation=True)
        inputs = {k: v.to(self.device) for k, v in inputs.items()}
        
        with torch.no_grad():
            outputs = self.model(**inputs)
            scores = torch.softmax(outputs.logits, dim=1)
            
        results = []
        for score in scores:
            results.append({
                "positive": float(score[2]),
                "neutral": float(score[1]),
                "negative": float(score[0])
            })
            
        return results
