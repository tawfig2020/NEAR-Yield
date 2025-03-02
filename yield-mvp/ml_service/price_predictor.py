"""
Price Prediction Module for NEAR Deep Yield
Uses deep learning to predict NEAR token price movements
"""
import torch
import torch.nn as nn
import numpy as np
from sklearn.preprocessing import MinMaxScaler

class LSTMPredictor(nn.Module):
    def __init__(self, input_dim=5, hidden_dim=128, num_layers=2, dropout=0.2):
        super().__init__()
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers
        self.lstm = nn.LSTM(input_dim, hidden_dim, num_layers, batch_first=True, dropout=dropout)
        self.fc = nn.Linear(hidden_dim, 1)
        
    def forward(self, x):
        h0 = torch.zeros(self.num_layers, x.size(0), self.hidden_dim).to(x.device)
        c0 = torch.zeros(self.num_layers, x.size(0), self.hidden_dim).to(x.device)
        out, _ = self.lstm(x, (h0, c0))
        out = self.fc(out[:, -1, :])
        return out

class PricePredictor:
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = LSTMPredictor().to(self.device)
        self.scaler = MinMaxScaler()
        
    def prepare_data(self, data, sequence_length=10):
        """
        Prepare time series data for prediction
        data: DataFrame with OHLCV data
        """
        scaled_data = self.scaler.fit_transform(data)
        sequences = []
        targets = []
        
        for i in range(len(scaled_data) - sequence_length):
            sequences.append(scaled_data[i:(i + sequence_length)])
            targets.append(scaled_data[i + sequence_length, 0])  # Predict close price
            
        return torch.FloatTensor(sequences).to(self.device), torch.FloatTensor(targets).to(self.device)
        
    def train(self, train_data, epochs=100, batch_size=32):
        """
        Train the price prediction model
        """
        X, y = self.prepare_data(train_data)
        optimizer = torch.optim.Adam(self.model.parameters())
        criterion = nn.MSELoss()
        
        for epoch in range(epochs):
            self.model.train()
            for i in range(0, len(X), batch_size):
                batch_X = X[i:i+batch_size]
                batch_y = y[i:i+batch_size]
                
                optimizer.zero_grad()
                outputs = self.model(batch_X)
                loss = criterion(outputs.squeeze(), batch_y)
                loss.backward()
                optimizer.step()
                
            if (epoch + 1) % 10 == 0:
                print(f'Epoch [{epoch+1}/{epochs}], Loss: {loss.item():.4f}')
                
    def predict(self, data):
        """
        Make price predictions
        Returns: predicted price for next time step
        """
        self.model.eval()
        with torch.no_grad():
            X, _ = self.prepare_data(data[-10:])  # Use last 10 time steps
            prediction = self.model(X)
            prediction = self.scaler.inverse_transform(prediction.cpu().numpy())
            return prediction[0][0]
