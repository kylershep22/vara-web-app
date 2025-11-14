import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import logger from '../utils/logger';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Store error details in state
    this.setState({
      error,
      errorInfo
    });

    // Log error with structured logging
    logger.error('React ErrorBoundary caught an error', error, {
      level: this.props.level || 'root',
      featureName: this.props.featureName,
      componentStack: errorInfo?.componentStack,
      errorBoundary: true
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      const { level = 'root', featureName } = this.props;

      return (
        <div className="min-h-screen bg-[#F3F4EF] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl border border-[#D5E3D1] p-8">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-[#3E3E3E] text-center mb-3">
              {level === 'root' ? 'Something went wrong' : `${featureName || 'This feature'} encountered an error`}
            </h1>

            {/* Message */}
            <p className="text-sm text-gray-600 text-center mb-6">
              {level === 'root'
                ? "We're sorry, but something unexpected happened. Please try refreshing the page."
                : "Don't worry, the rest of the app is still working. Try going back to the dashboard."
              }
            </p>

            {/* Error details (only in development) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6 p-4 bg-gray-50 rounded-lg text-xs">
                <summary className="cursor-pointer font-medium text-gray-700 mb-2">
                  Error Details (Development Only)
                </summary>
                <pre className="text-red-600 overflow-auto max-h-40">
                  {this.state.error.toString()}
                  {'\n'}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-[#1B5E57] to-[#B8CDBA] text-white hover:brightness-110 transition"
              >
                <RefreshCw size={18} />
                Try Again
              </button>

              {level !== 'root' && (
                <button
                  onClick={this.handleGoHome}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-[#D5E3D1] text-[#3E3E3E] hover:bg-[#F3F4EF] transition"
                >
                  <Home size={18} />
                  Go to Dashboard
                </button>
              )}
            </div>

            {/* Help text */}
            <p className="text-xs text-gray-500 text-center mt-6">
              If this problem persists, please contact support or try refreshing the page.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
