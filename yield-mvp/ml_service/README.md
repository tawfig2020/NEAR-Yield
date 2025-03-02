# NEAR Deep Yield ML Service

This service provides machine learning capabilities for the NEAR Deep Yield platform, including:

- Sentiment Analysis
- Price Prediction
- Strategy Optimization

## Components

### 1. Sentiment Analyzer
- Uses BERT-based model for social media sentiment analysis
- Supports both single text and batch processing
- Returns sentiment scores (positive, neutral, negative)

### 2. Price Predictor
- LSTM-based deep learning model for price prediction
- Features:
  - Time series preprocessing
  - Model training
  - Price forecasting

### 3. Strategy Optimizer
- Reinforcement learning for trading strategy optimization
- DQN (Deep Q-Network) implementation
- Combines market data and sentiment analysis

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Initialize the service:
```python
from ml_service.sentiment_analyzer import SentimentAnalyzer
from ml_service.price_predictor import PricePredictor
from ml_service.strategy_optimizer import StrategyOptimizer

# Initialize components
sentiment_analyzer = SentimentAnalyzer()
price_predictor = PricePredictor()
strategy_optimizer = StrategyOptimizer(state_size=10, action_size=2)
```

## Usage Examples

### Sentiment Analysis
```python
# Analyze single text
sentiment = sentiment_analyzer.analyze_text("NEAR protocol is showing strong growth")

# Analyze batch of texts
sentiments = sentiment_analyzer.analyze_batch(["NEAR is great", "Market is down"])
```

### Price Prediction
```python
# Train model
price_predictor.train(historical_data)

# Make prediction
next_price = price_predictor.predict(current_data)
```

### Strategy Optimization
```python
# Optimize trading strategy
optimal_params = strategy_optimizer.optimize_strategy(market_data, sentiment_data)
```

## Model Training

The service includes pre-trained models, but you can retrain them with your own data:

1. Sentiment Analysis: Fine-tune BERT model
2. Price Prediction: Train LSTM with historical NEAR price data
3. Strategy Optimization: Train DQN with market data and sentiment scores

## Dependencies

- PyTorch
- TensorFlow
- scikit-learn
- pandas
- numpy
- transformers (for BERT)
