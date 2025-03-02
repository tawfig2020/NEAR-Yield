use serde::{Deserialize, Serialize};
use tokio::sync::broadcast;
use std::error::Error;
use reqwest::Client;
use rust_bert::pipeline::sentiment::SentimentModel;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SentimentData {
    pub score: f32,
    pub confidence: f32,
    pub sources: Vec<String>,
    pub timestamp: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewsItem {
    pub title: String,
    pub url: String,
    pub source: String,
    pub sentiment: f32,
}

pub struct SentimentAnalyzer {
    model: SentimentModel,
    twitter_client: Client,
    cryptopanic_client: Client,
    alert_tx: broadcast::Sender<SentimentAlert>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SentimentAlert {
    ThresholdBreached {
        current_score: f32,
        threshold: f32,
        reason: String,
    },
    SignificantChange {
        old_score: f32,
        new_score: f32,
        change_percentage: f32,
    },
}

impl SentimentAnalyzer {
    pub async fn new(alert_tx: broadcast::Sender<SentimentAlert>) -> Result<Self, Box<dyn Error>> {
        Ok(Self {
            model: SentimentModel::new(Default::default())?,
            twitter_client: Client::new(),
            cryptopanic_client: Client::new(),
            alert_tx,
        })
    }

    pub async fn analyze_sentiment(&self) -> Result<SentimentData, Box<dyn Error>> {
        let mut sources = Vec::new();
        let mut total_score = 0.0;
        let mut total_weight = 0.0;

        // Analyze Twitter sentiment via Masa
        if let Ok(twitter_data) = self.get_twitter_sentiment().await {
            total_score += twitter_data.score * 0.4; // 40% weight
            total_weight += 0.4;
            sources.push("Twitter".to_string());
        }

        // Analyze CryptoPanic news
        if let Ok(news_data) = self.get_cryptopanic_sentiment().await {
            total_score += news_data.score * 0.3; // 30% weight
            total_weight += 0.3;
            sources.push("CryptoPanic".to_string());
        }

        // Analyze on-chain metrics
        if let Ok(chain_data) = self.get_onchain_sentiment().await {
            total_score += chain_data.score * 0.3; // 30% weight
            total_weight += 0.3;
            sources.push("On-chain".to_string());
        }

        let final_score = if total_weight > 0.0 {
            total_score / total_weight
        } else {
            50.0 // Neutral score if no data available
        };

        Ok(SentimentData {
            score: final_score,
            confidence: total_weight,
            sources,
            timestamp: chrono::Utc::now().timestamp(),
        })
    }

    async fn get_twitter_sentiment(&self) -> Result<SentimentData, Box<dyn Error>> {
        let tweets = self.fetch_near_tweets().await?;
        let mut total_score = 0.0;

        for tweet in tweets {
            let sentiment = self.model.predict(&[&tweet])?;
            total_score += match sentiment[0] {
                rust_bert::pipelines::sentiment::Sentiment::Positive => 75.0,
                rust_bert::pipelines::sentiment::Sentiment::Negative => 25.0,
            };
        }

        Ok(SentimentData {
            score: total_score / tweets.len() as f32,
            confidence: 0.8,
            sources: vec!["Twitter".to_string()],
            timestamp: chrono::Utc::now().timestamp(),
        })
    }

    async fn get_cryptopanic_sentiment(&self) -> Result<SentimentData, Box<dyn Error>> {
        let news = self.fetch_cryptopanic_news().await?;
        let mut total_score = 0.0;

        for item in news {
            total_score += item.sentiment;
        }

        Ok(SentimentData {
            score: total_score / news.len() as f32,
            confidence: 0.7,
            sources: vec!["CryptoPanic".to_string()],
            timestamp: chrono::Utc::now().timestamp(),
        })
    }

    async fn get_onchain_sentiment(&self) -> Result<SentimentData, Box<dyn Error>> {
        // Analyze TVL changes, transaction volume, etc.
        // This is a placeholder implementation
        Ok(SentimentData {
            score: 65.0,
            confidence: 0.9,
            sources: vec!["On-chain".to_string()],
            timestamp: chrono::Utc::now().timestamp(),
        })
    }

    async fn fetch_near_tweets(&self) -> Result<Vec<String>, Box<dyn Error>> {
        // Implement Twitter API call via Masa
        Ok(vec!["Sample NEAR tweet".to_string()])
    }

    async fn fetch_cryptopanic_news(&self) -> Result<Vec<NewsItem>, Box<dyn Error>> {
        // Implement CryptoPanic API call
        Ok(vec![NewsItem {
            title: "Sample NEAR news".to_string(),
            url: "https://example.com".to_string(),
            source: "CryptoPanic".to_string(),
            sentiment: 65.0,
        }])
    }

    pub fn start_monitoring(&self, threshold: f32) {
        let alert_tx = self.alert_tx.clone();
        
        tokio::spawn(async move {
            let mut last_score = 50.0;
            
            loop {
                if let Ok(sentiment) = self.analyze_sentiment().await {
                    // Check threshold breach
                    if sentiment.score < threshold {
                        let _ = alert_tx.send(SentimentAlert::ThresholdBreached {
                            current_score: sentiment.score,
                            threshold,
                            reason: "Sentiment dropped below threshold".to_string(),
                        });
                    }

                    // Check significant changes
                    let change = ((sentiment.score - last_score) / last_score * 100.0).abs();
                    if change > 10.0 {
                        let _ = alert_tx.send(SentimentAlert::SignificantChange {
                            old_score: last_score,
                            new_score: sentiment.score,
                            change_percentage: change,
                        });
                    }

                    last_score = sentiment.score;
                }

                tokio::time::sleep(tokio::time::Duration::from_secs(300)).await;
            }
        });
    }
}
