use dotenv::dotenv;
use reqwest;
use serde_json::json;
use std::env;
use tokio;

// Test CryptoPanic API
async fn test_cryptopanic_api() -> Result<(), Box<dyn std::error::Error>> {
    let api_key = env::var("CRYPTOPANIC_API_KEY")?;
    let client = reqwest::Client::new();
    let response = client
        .get("https://cryptopanic.com/api/v1/posts/")
        .query(&[("auth_token", api_key)])
        .send()
        .await?;
    
    assert!(response.status().is_success());
    println!("✅ CryptoPanic API: Connection successful");
    Ok(())
}

// Test Hugging Face API
async fn test_huggingface_api() -> Result<(), Box<dyn std::error::Error>> {
    let api_key = env::var("HUGGING_FACE_API_KEY")?;
    let client = reqwest::Client::new();
    let response = client
        .post("https://api-inference.huggingface.co/models/bert-base-uncased")
        .header("Authorization", format!("Bearer {}", api_key))
        .json(&json!({
            "inputs": "Testing Hugging Face API connection"
        }))
        .send()
        .await?;
    
    assert!(response.status().is_success());
    println!("✅ Hugging Face API: Connection successful");
    Ok(())
}

// Test Gemini API
async fn test_gemini_api() -> Result<(), Box<dyn std::error::Error>> {
    let api_key = env::var("GEMINI_API_KEY")?;
    let client = reqwest::Client::new();
    let response = client
        .post(format!(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={}",
            api_key
        ))
        .json(&json!({
            "contents": [{
                "parts": [{
                    "text": "Hello, testing Gemini API connection"
                }]
            }]
        }))
        .send()
        .await?;
    
    assert!(response.status().is_success());
    println!("✅ Gemini API: Connection successful");
    Ok(())
}

// Test NEAR RPC
async fn test_near_rpc() -> Result<(), Box<dyn std::error::Error>> {
    let rpc_url = env::var("NEAR_RPC_TESTNET")?;
    let client = reqwest::Client::new();
    let response = client
        .post(&rpc_url)
        .json(&json!({
            "jsonrpc": "2.0",
            "id": "test",
            "method": "status",
            "params": []
        }))
        .send()
        .await?;
    
    assert!(response.status().is_success());
    println!("✅ NEAR RPC: Connection successful");
    Ok(())
}

// Test Masa API
async fn test_masa_api() -> Result<(), Box<dyn std::error::Error>> {
    let api_key = env::var("MASA_API_KEY")?;
    let api_secret = env::var("MASA_API_SECRET")?;
    let endpoint = env::var("MASA_API_ENDPOINT")?;
    
    let client = reqwest::Client::new();
    let response = client
        .get(&format!("{}/health", endpoint))
        .header("x-api-key", api_key)
        .header("x-api-secret", api_secret)
        .send()
        .await?;
    
    assert!(response.status().is_success());
    println!("✅ Masa API: Connection successful");
    Ok(())
}

// Test GCP Secret Manager
async fn test_gcp_secret_manager() -> Result<(), Box<dyn std::error::Error>> {
    let project_id = env::var("GCP_PROJECT_ID")?;
    let client = reqwest::Client::new();
    
    // Assuming we're using service account authentication
    let response = client
        .get(&format!(
            "https://secretmanager.googleapis.com/v1/projects/{}/secrets",
            project_id
        ))
        .send()
        .await?;
    
    assert!(response.status().is_success());
    println!("✅ GCP Secret Manager: Connection successful");
    Ok(())
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv().ok();
    
    println!("🔍 Starting API endpoint tests...\n");
    
    // Test all APIs
    let tests = vec![
        ("CryptoPanic", test_cryptopanic_api()),
        ("Hugging Face", test_huggingface_api()),
        ("Gemini", test_gemini_api()),
        ("NEAR RPC", test_near_rpc()),
        ("Masa", test_masa_api()),
        ("GCP Secret Manager", test_gcp_secret_manager()),
    ];
    
    for (name, test) in tests {
        match test.await {
            Ok(_) => println!("✅ {} API test passed", name),
            Err(e) => println!("❌ {} API test failed: {}", name, e),
        }
    }
    
    println!("\n🏁 API testing completed");
    Ok(())
}
