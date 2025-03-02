import React from 'react';
import { useErrorTracking } from '../hooks/useErrorTracking';
import { errorTrackingService } from '../services/errorTracking';

class ErrorBoundaryComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isRecovering: false
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    
    errorTrackingService.sendError(error, {
      type: 'react',
      component: this.props.componentName,
      errorInfo: errorInfo
    });
  }

  async attemptRecovery() {
    this.setState({ isRecovering: true });
    
    try {
      await errorTrackingService.attemptRecovery(this.state.error, {
        type: this.props.recoveryStrategy || 'default',
        fallbackState: this.props.fallbackState
      });
      
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        isRecovering: false
      });
    } catch (error) {
      this.setState({ isRecovering: false });
      console.error('Recovery failed:', error);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          {this.props.fallback ? (
            this.props.fallback(this.state.error, () => this.attemptRecovery())
          ) : (
            <div>
              <p>{this.state.error?.message || 'An error occurred'}</p>
              {this.state.isRecovering ? (
                <p>Attempting to recover...</p>
              ) : (
                <button onClick={() => this.attemptRecovery()}>
                  Try to recover
                </button>
              )}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook wrapper for the error boundary
export const ErrorBoundary = ({ children, ...props }) => {
  useErrorTracking({
    onError: (error, info) => {
      errorTrackingService.sendError(error, {
        type: 'react',
        ...info
      });
    },
    onRecovery: () => {
      errorTrackingService.sendAnalytics();
    }
  });

  return (
    <ErrorBoundaryComponent {...props}>
      {children}
    </ErrorBoundaryComponent>
  );
};
