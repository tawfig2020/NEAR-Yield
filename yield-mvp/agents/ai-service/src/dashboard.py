import streamlit as st
import plotly.graph_objects as go
import plotly.express as px
import pandas as pd
import requests
from datetime import datetime, timedelta
import asyncio
import websockets
import json

# Configure page
st.set_page_config(
    page_title="NEAR Yield Optimizer Dashboard",
    page_icon="📈",
    layout="wide"
)

# Initialize session state
if 'historical_data' not in st.session_state:
    st.session_state.historical_data = []

async def fetch_realtime_data():
    """Fetch real-time sentiment data via WebSocket"""
    uri = "ws://localhost:8000/ws"
    async with websockets.connect(uri) as websocket:
        while True:
            try:
                data = await websocket.recv()
                sentiment_data = json.loads(data)
                st.session_state.historical_data.append(sentiment_data)
                # Keep only last 24 hours
                cutoff = datetime.now() - timedelta(hours=24)
                st.session_state.historical_data = [
                    d for d in st.session_state.historical_data
                    if datetime.fromisoformat(d['timestamp']) > cutoff
                ]
            except Exception as e:
                st.error(f"WebSocket error: {e}")
                break

def create_sentiment_chart():
    """Create sentiment trend visualization"""
    if not st.session_state.historical_data:
        return None
    
    df = pd.DataFrame(st.session_state.historical_data)
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    
    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=df['timestamp'],
        y=df['average_score'],
        mode='lines+markers',
        name='Sentiment Score'
    ))
    
    fig.update_layout(
        title='Sentiment Trend (Last 24 Hours)',
        xaxis_title='Time',
        yaxis_title='Sentiment Score',
        template='plotly_dark'
    )
    
    return fig

def create_volume_chart():
    """Create tweet volume visualization"""
    if not st.session_state.historical_data:
        return None
    
    df = pd.DataFrame(st.session_state.historical_data)
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df = df.set_index('timestamp')
    
    volume = df.resample('1H').count()
    
    fig = go.Figure()
    fig.add_trace(go.Bar(
        x=volume.index,
        y=volume['average_score'],
        name='Tweet Volume'
    ))
    
    fig.update_layout(
        title='Tweet Volume by Hour',
        xaxis_title='Time',
        yaxis_title='Number of Tweets',
        template='plotly_dark'
    )
    
    return fig

def main():
    st.title("NEAR Yield Optimizer Dashboard")
    
    # Sidebar
    st.sidebar.header("Settings")
    update_interval = st.sidebar.slider(
        "Update Interval (seconds)",
        min_value=1,
        max_value=60,
        value=5
    )
    
    # Main content
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("Market Sentiment")
        sentiment_chart = create_sentiment_chart()
        if sentiment_chart:
            st.plotly_chart(sentiment_chart, use_container_width=True)
        else:
            st.info("Waiting for sentiment data...")
    
    with col2:
        st.subheader("Tweet Volume")
        volume_chart = create_volume_chart()
        if volume_chart:
            st.plotly_chart(volume_chart, use_container_width=True)
        else:
            st.info("Waiting for volume data...")
    
    # Recent tweets
    st.subheader("Recent Analyzed Tweets")
    if st.session_state.historical_data:
        for data in st.session_state.historical_data[-5:]:
            for sentiment in data['detailed_sentiments']:
                st.write(f"""
                Tweet: {sentiment['text']}
                Sentiment: {sentiment['sentiment']}
                Score: {sentiment['score']:.2f}
                """)
    
    # Auto-refresh
    st.empty()
    asyncio.run(fetch_realtime_data())

if __name__ == "__main__":
    main()
