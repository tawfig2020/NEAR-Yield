import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Strategy {
  id: string;
  name: string;
  description: string;
  risk: number;
  expectedYield: number;
  minDeposit: number;
}

interface AIContextType {
  sentiment: number;
  strategies: Strategy[];
  loading: boolean;
  error: string | null;
  fetchStrategies: () => Promise<void>;
  updateSentiment: () => Promise<void>;
}

const AIContext = createContext<AIContextType | null>(null);

export const useAI = () => {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
};

interface AIProviderProps {
  children: ReactNode;
}

export const AIProvider: React.FC<AIProviderProps> = ({ children }) => {
  const [sentiment, setSentiment] = useState<number>(0);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStrategies = async () => {
    try {
      setLoading(true);
      // TODO: Implement API call to fetch strategies
      const mockStrategies: Strategy[] = [
        {
          id: '1',
          name: 'Conservative Yield',
          description: 'Low-risk strategy focusing on stable yields',
          risk: 2,
          expectedYield: 5,
          minDeposit: 10
        },
        {
          id: '2',
          name: 'Balanced Growth',
          description: 'Medium-risk strategy with balanced returns',
          risk: 5,
          expectedYield: 12,
          minDeposit: 50
        },
        {
          id: '3',
          name: 'High Yield',
          description: 'High-risk strategy targeting maximum yields',
          risk: 8,
          expectedYield: 25,
          minDeposit: 100
        }
      ];
      setStrategies(mockStrategies);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch strategies');
    } finally {
      setLoading(false);
    }
  };

  const updateSentiment = async () => {
    try {
      setLoading(true);
      // TODO: Implement API call to get market sentiment
      const mockSentiment = Math.floor(Math.random() * 100);
      setSentiment(mockSentiment);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update sentiment');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStrategies();
    updateSentiment();
  }, []);

  return (
    <AIContext.Provider
      value={{
        sentiment,
        strategies,
        loading,
        error,
        fetchStrategies,
        updateSentiment,
      }}
    >
      {children}
    </AIContext.Provider>
  );
};
