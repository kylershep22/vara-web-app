/**
 * Error Boundary Component
 * Catches React errors and reports them to Crashlytics
 */

import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { logError } from '../../services/crashReporting.service';
import { Colors } from '../../constants';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  componentStack: string | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      componentStack: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log the error to Crashlytics
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Store component stack for display
    this.setState({ componentStack: errorInfo.componentStack || null });

    // Safely log to crash reporting without causing additional crashes
    try {
      logError(error, `Component Stack: ${errorInfo.componentStack}`);
    } catch (loggingError) {
      // If crash reporting fails, just log to console
      console.error('Failed to log error to crash reporting:', loggingError);
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI or use provided fallback
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.emoji}>😔</Text>
            <Text style={styles.title}>Something didn't work as expected. We've been notified.</Text>
            <Text style={styles.message}>
              We'll look into this soon.
            </Text>
            {this.state.error && (
              <View style={styles.errorDetails}>
                <Text style={styles.errorText}>{this.state.error.toString()}</Text>
                {this.state.componentStack && (
                  <Text style={[styles.errorText, { marginTop: 8, color: '#666' }]}>
                    Component stack:{'\n'}
                    {this.state.componentStack.split('\n').slice(0, 8).join('\n')}
                  </Text>
                )}
              </View>
            )}
            <TouchableOpacity style={styles.button} onPress={this.handleReset}>
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    maxWidth: 400,
  },
  emoji: {
    fontSize: 32,
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  errorDetails: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  errorText: {
    fontSize: 12,
    color: Colors.softCoral,
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: '#1B5E57',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ErrorBoundary;
