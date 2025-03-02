import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DataSourceConfig from '../components/DataSourceConfig';

describe('DataSourceConfig Component', () => {
  beforeEach(() => {
    render(<DataSourceConfig />);
  });

  test('renders data source configuration form', () => {
    expect(screen.getByText('Data Source Configuration')).toBeInTheDocument();
    expect(screen.getByText('Twitter Integration')).toBeInTheDocument();
    expect(screen.getByText('Reddit Integration')).toBeInTheDocument();
    expect(screen.getByText('Santiment Integration')).toBeInTheDocument();
  });

  test('validates API keys', async () => {
    const twitterInput = screen.getByLabelText('Twitter API Key');
    fireEvent.change(twitterInput, { target: { value: 'invalid-key' } });
    
    const saveButton = screen.getByText('Save Configuration');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Invalid Twitter API key')).toBeInTheDocument();
    });
  });

  test('saves valid configuration', async () => {
    const twitterInput = screen.getByLabelText('Twitter API Key');
    const redditInput = screen.getByLabelText('Reddit Client ID');
    const santimentInput = screen.getByLabelText('Santiment API Key');

    fireEvent.change(twitterInput, { target: { value: 'valid-twitter-key' } });
    fireEvent.change(redditInput, { target: { value: 'valid-reddit-id' } });
    fireEvent.change(santimentInput, { target: { value: 'valid-santiment-key' } });

    const saveButton = screen.getByText('Save Configuration');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Configuration saved successfully')).toBeInTheDocument();
    });
  });

  test('handles connection test', async () => {
    const testButton = screen.getByText('Test Connections');
    fireEvent.click(testButton);

    await waitFor(() => {
      expect(screen.getByText('Testing connections...')).toBeInTheDocument();
    });
  });

  test('updates sentiment weights', async () => {
    const twitterWeight = screen.getByLabelText('Twitter Weight');
    fireEvent.change(twitterWeight, { target: { value: '40' } });

    await waitFor(() => {
      expect(screen.getByText('Total weight must equal 100%')).toBeInTheDocument();
    });
  });
});
