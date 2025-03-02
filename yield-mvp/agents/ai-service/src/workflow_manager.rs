use near_sdk::json_types::U128;
use serde::{Deserialize, Serialize};
use tokio::time::{Duration, interval};
use std::sync::Arc;
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize)]
pub struct WorkflowConfig {
    pub scraping: ScrapingConfig,
    pub fallback: FallbackConfig,
    pub rebalancing: RebalancingConfig,
    pub safety: SafetyConfig,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MarketSentiment {
    pub score: f64,
    pub source: String,
    pub timestamp: u64,
}

pub struct WorkflowManager {
    config: WorkflowConfig,
    sentiment_analyzer: Arc<SentimentAnalyzer>,
    portfolio_manager: Arc<PortfolioManager>,
    near_client: Arc<NearClient>,
}

impl WorkflowManager {
    pub async fn new(config_path: &str) -> anyhow::Result<Self> {
        let config = load_config(config_path)?;
        Ok(Self {
            config,
            sentiment_analyzer: Arc::new(SentimentAnalyzer::new()),
            portfolio_manager: Arc::new(PortfolioManager::new()),
            near_client: Arc::new(NearClient::new()),
        })
    }

    pub async fn start(&self) -> anyhow::Result<()> {
        let mut interval = interval(Duration::from_secs(
            self.config.scraping.default_interval
        ));

        loop {
            interval.tick().await;
            
            // 1. Check NEAR price volatility
            let price_change = self.check_price_volatility().await?;
            if price_change.abs() >= self.config.scraping.price_volatility_threshold {
                interval = interval(Duration::from_secs(
                    self.config.scraping.volatile_interval
                ));
            }

            // 2. Gather sentiment data
            let sentiment = self.gather_sentiment_data().await?;
            
            // 3. Apply strategy based on sentiment
            self.apply_strategy(&sentiment).await?;
            
            // 4. Monitor and adjust
            self.monitor_performance().await?;
        }
    }

    async fn gather_sentiment_data(&self) -> anyhow::Result<MarketSentiment> {
        // Try Twitter first
        let tweets = self.sentiment_analyzer.get_near_tweets().await?;
        
        if tweets.len() >= self.config.scraping.minimum_tweets {
            let score = self.sentiment_analyzer.analyze_tweets(&tweets).await?;
            return Ok(MarketSentiment {
                score,
                source: "twitter".to_string(),
                timestamp: std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)?
                    .as_secs(),
            });
        }

        // Fallback to CryptoPanic
        let news = self.sentiment_analyzer.get_cryptopanic_news().await?;
        if !news.is_empty() {
            let score = self.sentiment_analyzer.analyze_news(&news).await?;
            return Ok(MarketSentiment {
                score,
                source: "cryptopanic".to_string(),
                timestamp: std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)?
                    .as_secs(),
            });
        }

        // Final fallback to historical average
        let historical_score = self.sentiment_analyzer
            .get_historical_average(Duration::from_secs(
                self.config.fallback.historical_window
            ))
            .await?;
            
        Ok(MarketSentiment {
            score: historical_score,
            source: "historical".to_string(),
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)?
                .as_secs(),
        })
    }

    async fn apply_strategy(&self, sentiment: &MarketSentiment) -> anyhow::Result<()> {
        let current_allocation = self.portfolio_manager.get_allocation().await?;
        
        // Apply AI safety strategy
        if sentiment.score <= self.config.safety.emergency_threshold as f64 {
            self.apply_safety_strategy().await?;
            return Ok(());
        }

        // Regular strategy application
        match sentiment.score as u8 {
            0..=25 => {
                // Bearish: Move to staking and stable pools
                self.portfolio_manager
                    .rebalance(HashMap::from([
                        ("staking".to_string(), 50),
                        ("stable_pools".to_string(), 50),
                    ]))
                    .await?;
            }
            26..=74 => {
                // Neutral: Balanced approach
                self.portfolio_manager
                    .rebalance(HashMap::from([
                        ("staking".to_string(), 30),
                        ("stable_pools".to_string(), 40),
                        ("near_pools".to_string(), 30),
                    ]))
                    .await?;
            }
            75..=100 => {
                // Bullish: Higher risk tolerance
                self.portfolio_manager
                    .rebalance(HashMap::from([
                        ("staking".to_string(), 20),
                        ("near_pools".to_string(), 50),
                        ("aurora_pools".to_string(), 30),
                    ]))
                    .await?;
            }
        }

        Ok(())
    }

    async fn apply_safety_strategy(&self) -> anyhow::Result<()> {
        // Emergency reallocation
        self.portfolio_manager
            .rebalance(HashMap::from([
                ("staking".to_string(), 50),
                ("stable_pools".to_string(), 50),
            ]))
            .await?;

        // Deploy safety proxy contract if not already deployed
        if !self.near_client.check_proxy_deployed().await? {
            self.near_client.deploy_safety_proxy().await?;
        }

        Ok(())
    }

    async fn monitor_performance(&self) -> anyhow::Result<()> {
        let performance = self.portfolio_manager.calculate_performance().await?;
        
        // Log performance metrics
        log::info!("Strategy Performance: {:#?}", performance);
        
        // Adjust allocation based on performance
        if performance.apy > 12.0 {  // If performing well, allow more risk
            self.portfolio_manager.increase_risk_tolerance().await?;
        } else if performance.apy < 5.0 {  // If performing poorly, reduce risk
            self.portfolio_manager.decrease_risk_tolerance().await?;
        }

        Ok(())
    }

    async fn check_price_volatility(&self) -> anyhow::Result<f64> {
        let price_change = self.near_client.get_price_change_24h().await?;
        
        // Log volatility
        log::info!("NEAR 24h price change: {}%", price_change);
        
        Ok(price_change)
    }
}
