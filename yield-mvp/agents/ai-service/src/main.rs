use actix_web::{web, App, HttpResponse, HttpServer};
use serde::{Deserialize, Serialize};
use tokio_tungstenite::connect_async;
use futures_util::StreamExt;
use std::env;
use dotenv::dotenv;
use log::{info, error};
use chrono::{DateTime, Utc};
use tokio::time::{sleep, Duration};
use actix_web::{web, App, HttpServer, HttpResponse};
use tokio_tungstenite::connect_async;
use serde::{Deserialize, Serialize};
use futures::StreamExt;
use dotenv::dotenv;
use std::sync::Arc;
use tokio::sync::RwLock;
use config::{YieldConfig, RiskLevel, PortfolioAllocation};
use optimizer::{YieldOptimizer, AlertMessage};
use tokio::sync::broadcast;
use masa::{MasaIntegration, MasaProfile, UserPreferences};

#[derive(Debug, Serialize, Deserialize)]
struct MarketData {
    pool_id: String,
    apy: f64,
    tvl: f64,
    sentiment_score: f64,
}

#[derive(Debug, Serialize, Deserialize)]
struct AIAnalysis {
    recommendation: String,
    confidence: f64,
    risk_score: f64,
    timestamp: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
struct SentimentData {
    score: f64,
    trend: String,
    last_update: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct Strategy {
    id: String,
    high_sentiment_threshold: f64,
    low_sentiment_threshold: f64,
    high_risk_pool: String,
    low_risk_pool: String,
    is_active: bool,
}

struct AppState {
    sentiment: RwLock<SentimentData>,
    strategies: RwLock<Vec<Strategy>>,
    optimizer: Arc<Mutex<YieldOptimizer>>,
    alert_tx: broadcast::Sender<AlertMessage>,
}

fn calculate_confidence_score(market_data: &MarketData) -> f64 {
    let tvl_confidence = if market_data.tvl > 1_000_000.0 { 0.8 } else { 0.5 };
    let apy_confidence = if market_data.apy < 50.0 { 0.9 } else { 0.6 };
    
    (tvl_confidence + apy_confidence) / 2.0
}

fn generate_recommendation(market_data: &MarketData, risk_score: f64, sentiment: f64) -> String {
    let high_tvl = market_data.tvl > 1_000_000.0;
    let high_apy = market_data.apy > 30.0;

    match (risk_score > 0.7, sentiment > 0.0, high_tvl, high_apy) {
        (true, _, _, _) => "HIGH RISK: Consider reducing exposure".to_string(),
        (_, true, true, false) => "OPPORTUNITY: Consider increasing position (High TVL)".to_string(),
        (_, true, _, true) => "CAUTION: High APY detected, verify sustainability".to_string(),
        (_, false, _, _) => "HOLD: Monitor market conditions".to_string(),
        _ => "NEUTRAL: Maintain current position".to_string(),
    }
}

async fn process_market_data(data: web::Json<MarketData>) -> HttpResponse {
    info!("Processing market data for pool: {}", data.pool_id);

    let risk_score = 0.5; 
    let confidence = calculate_confidence_score(&data);
    
    let analysis = AIAnalysis {
        recommendation: generate_recommendation(&data, risk_score, data.sentiment_score),
        confidence,
        risk_score,
        timestamp: Utc::now(),
    };
    
    HttpResponse::Ok().json(analysis)
}

async fn process_twitter_stream(state: web::Data<Arc<AppState>>) {
    let twitter_url = std::env::var("TWITTER_WEBSOCKET_URL").expect("TWITTER_WEBSOCKET_URL must be set");
    
    loop {
        match connect_async(&twitter_url).await {
            Ok((ws_stream, _)) => {
                let (_, read) = ws_stream.split();
                
                read.for_each(|message| async {
                    if let Ok(msg) = message {
                        // Process tweet and update sentiment
                        let mut sentiment = state.sentiment.write().await;
                        // Update sentiment based on tweet analysis
                        // This is where we'd integrate with the Hugging Face model
                        
                        // Execute strategies based on new sentiment
                        let strategies = state.strategies.read().await;
                        for strategy in strategies.iter() {
                            if strategy.is_active {
                                execute_strategy(strategy, &sentiment).await;
                            }
                        }
                    }
                }).await;
            }
            Err(e) => {
                eprintln!("WebSocket connection error: {}", e);
                tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
            }
        }
    }
}

async fn execute_strategy(strategy: &Strategy, sentiment: &SentimentData) {
    if sentiment.score >= strategy.high_sentiment_threshold {
        // Move funds to high-risk pool
        println!("Moving funds to high-risk pool: {}", strategy.high_risk_pool);
        // Implement NEAR contract call here
    } else if sentiment.score <= strategy.low_sentiment_threshold {
        // Move funds to low-risk pool
        println!("Moving funds to low-risk pool: {}", strategy.low_risk_pool);
        // Implement NEAR contract call here
    }
}

async fn get_sentiment(state: web::Data<Arc<AppState>>) -> HttpResponse {
    let sentiment = state.sentiment.read().await;
    HttpResponse::Ok().json(&*sentiment)
}

async fn create_strategy(
    state: web::Data<Arc<AppState>>,
    strategy: web::Json<Strategy>,
) -> HttpResponse {
    let mut strategies = state.strategies.write().await;
    strategies.push(strategy.into_inner());
    HttpResponse::Ok().finish()
}

async fn connect_websocket() -> Result<(), Box<dyn std::error::Error>> {
    let ws_url = env::var("WEBSOCKET_URL")
        .unwrap_or_else(|_| "wss://stream.twitter.com/1.1/statuses/filter.json".to_string());

    let mut retry_count = 0;
    const MAX_RETRIES: u32 = 5;
    const RETRY_DELAY: u64 = 5;

    while retry_count < MAX_RETRIES {
        info!("Attempting WebSocket connection (attempt {}/{})", retry_count + 1, MAX_RETRIES);
        
        match connect_async(&ws_url).await {
            Ok((ws_stream, _)) => {
                info!("WebSocket connection established");
                let (_write, read) = ws_stream.split();
                
                read.for_each(|message| async {
                    match message {
                        Ok(msg) => {
                            info!("Received market update: {}", msg);
                            // Process market update
                        }
                        Err(e) => error!("WebSocket message error: {}", e),
                    }
                })
                .await;
                
                return Ok(());
            }
            Err(e) => {
                error!("WebSocket connection failed: {}", e);
                retry_count += 1;
                if retry_count < MAX_RETRIES {
                    info!("Retrying in {} seconds...", RETRY_DELAY);
                    sleep(Duration::from_secs(RETRY_DELAY)).await;
                }
            }
        }
    }
    
    Err("Maximum WebSocket connection retries exceeded".into())
}

#[derive(Deserialize)]
struct OptimizationRequest {
    risk_level: RiskLevel,
    preferred_assets: Option<Vec<String>>,
}

#[derive(Serialize)]
struct OptimizationResponse {
    allocations: Vec<PortfolioAllocation>,
    expected_apy: f64,
    risk_score: f64,
}

async fn optimize_portfolio(
    data: web::Json<OptimizationRequest>,
    state: web::Data<Arc<AppState>>,
) -> impl Responder {
    let mut config = YieldConfig::new(data.risk_level.clone());
    if let Some(assets) = &data.preferred_assets {
        config.preferred_assets = assets.clone();
    }

    let optimizer = state.optimizer.lock().await;
    let allocations = optimizer.optimize_portfolio().await;
    let stats = optimizer.get_portfolio_stats(&allocations);

    HttpResponse::Ok().json(OptimizationResponse {
        allocations,
        expected_apy: stats.expected_apy,
        risk_score: stats.risk_score,
    })
}

async fn subscribe_alerts(state: web::Data<Arc<AppState>>) -> impl Responder {
    let mut rx = state.alert_tx.subscribe();
    
    // Set up SSE stream
    HttpResponse::Ok()
        .append_header(("Content-Type", "text/event-stream"))
        .streaming(async_stream::stream! {
            while let Ok(msg) = rx.recv().await {
                let payload = serde_json::to_string(&msg).unwrap();
                yield Ok(web::Bytes::from(format!("data: {}\n\n", payload)));
            }
        })
}

#[derive(Deserialize)]
struct SafetyStrategyRequest {
    near_wallet: String,
    twitter_handle: String,
    sentiment_threshold: f32,
    rebalance_percentage: f32,
}

#[derive(Serialize)]
struct SafetyStrategyResponse {
    strategy_id: String,
    masa_profile: MasaProfile,
    contract_address: String,
}

async fn deploy_safety_strategy(
    data: web::Json<SafetyStrategyRequest>,
    state: web::Data<Arc<AppState>>,
) -> impl Responder {
    // Initialize Masa integration
    let masa = MasaIntegration::new(
        std::env::var("MASA_API_KEY").expect("MASA_API_KEY must be set"),
        "https://ceramic-clay.3boxlabs.com",
    );

    // Link Twitter account and create profile
    let profile = match masa.link_twitter_account(&data.near_wallet, &data.twitter_handle).await {
        Ok(profile) => profile,
        Err(e) => return HttpResponse::BadRequest().json(format!("Failed to link Twitter: {}", e)),
    };

    // Deploy AutoRebalanceAgent contract
    let contract_address = match deploy_auto_rebalance_contract(
        &data.near_wallet,
        data.sentiment_threshold,
        data.rebalance_percentage,
    ).await {
        Ok(address) => address,
        Err(e) => return HttpResponse::InternalServerError().json(format!("Failed to deploy contract: {}", e)),
    };

    // Create strategy response
    let response = SafetyStrategyResponse {
        strategy_id: uuid::Uuid::new_v4().to_string(),
        masa_profile: profile,
        contract_address,
    };

    // Start sentiment monitoring
    tokio::spawn(monitor_sentiment(
        state.clone(),
        data.twitter_handle.clone(),
        contract_address.clone(),
        data.sentiment_threshold,
    ));

    HttpResponse::Ok().json(response)
}

async fn deploy_auto_rebalance_contract(
    owner_id: &str,
    sentiment_threshold: f32,
    rebalance_percentage: f32,
) -> Result<String, Box<dyn std::error::Error>> {
    // Deploy contract using near_sdk_sim or actual NEAR connection
    // This is a placeholder for actual deployment logic
    let contract_address = format!("auto-rebalance-{}.near", uuid::Uuid::new_v4());
    
    Ok(contract_address)
}

async fn monitor_sentiment(
    state: web::Data<Arc<AppState>>,
    twitter_handle: String,
    contract_address: String,
    threshold: f32,
) {
    let masa = MasaIntegration::new(
        std::env::var("MASA_API_KEY").expect("MASA_API_KEY must be set"),
        "https://ceramic-clay.3boxlabs.com",
    );

    loop {
        match masa.get_twitter_sentiment(&twitter_handle).await {
            Ok(sentiment) => {
                if sentiment < threshold {
                    // Call contract to execute rebalancing
                    if let Err(e) = execute_rebalance(&contract_address, sentiment).await {
                        eprintln!("Failed to execute rebalance: {}", e);
                    }

                    // Send alert
                    let _ = state.alert_tx.send(AlertMessage::RebalanceNeeded {
                        reason: format!("Low sentiment detected: {}%", sentiment),
                    });
                }
            }
            Err(e) => eprintln!("Failed to get sentiment: {}", e),
        }

        tokio::time::sleep(tokio::time::Duration::from_secs(300)).await;
    }
}

async fn execute_rebalance(contract_address: &str, sentiment: f32) -> Result<(), Box<dyn std::error::Error>> {
    // Execute contract call using near_sdk or RPC
    // This is a placeholder for actual contract interaction
    println!("Executing rebalance for contract {} with sentiment {}", contract_address, sentiment);
    Ok(())
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv().ok();
    env_logger::init();

    let host = env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let port = env::var("PORT").unwrap_or_else(|_| "8080".to_string());
    let bind_address = format!("{}:{}", host, port);

    info!("Starting AI service on {}", bind_address);

    let (alert_tx, _) = broadcast::channel(100);
    let alert_tx_clone = alert_tx.clone();

    // Initialize optimizer with moderate risk profile
    let optimizer = YieldOptimizer::new(
        YieldConfig::new(RiskLevel::Moderate),
        alert_tx,
    );
    let optimizer = Arc::new(Mutex::new(optimizer));

    let state = web::Data::new(Arc::new(AppState {
        sentiment: RwLock::new(SentimentData {
            score: 0.0,
            trend: "neutral".to_string(),
            last_update: chrono::Utc::now().to_rfc3339(),
        }),
        strategies: RwLock::new(Vec::new()),
        optimizer: optimizer.clone(),
        alert_tx: alert_tx_clone,
    }));
    
    let state_clone = state.clone();
    tokio::spawn(async move {
        process_twitter_stream(state_clone).await;
    });

    let state_clone = state.clone();
    tokio::spawn(async move {
        if let Err(e) = connect_websocket().await {
            error!("WebSocket connection error: {}", e);
        }
    });

    HttpServer::new(move || {
        App::new()
            .app_data(state.clone())
            .service(web::resource("/analyze").route(web::post().to(process_market_data)))
            .service(web::resource("/api/sentiment").route(web::get().to(get_sentiment)))
            .service(web::resource("/api/strategy").route(web::post().to(create_strategy)))
            .service(web::resource("/api/optimize").route(web::post().to(optimize_portfolio)))
            .service(web::resource("/api/alerts").route(web::get().to(subscribe_alerts)))
            .service(web::resource("/api/deploy-safety-strategy").route(web::post().to(deploy_safety_strategy)))
    })
    .bind(bind_address)?
    .run()
    .await
}
