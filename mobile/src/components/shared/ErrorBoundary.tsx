/**
 * Error Boundary Component
 *
 * Catches React render errors and shows a recovery UI.
 *
 * TWO SCOPES SINCE SLICE 7g, AND THE DIFFERENCE IS WHAT FAILED RATHER THAN HOW
 * IT LOOKS. `scope="app"` (the default) is the backstop at App.tsx:114, above
 * the providers and the navigator: when it catches, the whole app is gone and
 * the copy says so. `scope="surface"` is the per-screen and per-tab boundary
 * installed by navigation/screenBoundary.tsx, where the navigator's own chrome
 * survives the throw (the native-stack header and its back button, or the tab
 * bar), so the user still has a way out that no copy has to provide.
 *
 * NOTHING REPORTS, AND THAT IS WHY THE COPY CHANGED. `logError` below reaches
 * crashReporting.service.ts, whose every Sentry call is commented out and whose
 * `isInitialized` flag is never set true, so in production it returns without
 * sending anything; this boundary is that service's only caller in the app.
 * Before slice 7g a render throw was at least LOUD, because it killed the app
 * and the user noticed. Scoped boundaries trade that for a quiet panel, so the
 * app-level copy no longer claims the user has been notified. See the 7g
 * Section 13 entry and the Section 5 row carrying the @sentry/react-native
 * wiring as PRE-LAUNCH.
 */

import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { logError } from '../../services/crashReporting.service';
import { Colors } from '../../constants';

/**
 * APPROVED UI COPY. Owner Kyle, 2026-09-12 (slice 7g).
 *
 * HELD AS CONSTANTS AND RENDERED AS EXPRESSIONS, which is not a style
 * preference: JSX text children trip react/no-unescaped-entities on every
 * apostrophe, and three of this file's standing lint errors were exactly that.
 *
 * `appTitle` LOST THE SENTENCE "We've been notified." in this slice because it
 * was false. No sentinel on any of these - they are approved, so the pinned
 * count does not move.
 */
const COPY = {
  appTitle: "Something didn't work as expected.",
  appMessage: "We'll look into this soon.",
  surfaceTitle: "This part didn't load.",
  tryAgain: 'Try Again',
} as const;

type BoundaryScope = 'app' | 'surface';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** Defaults to 'app'. See the scope note in this file's header. */
  scope?: BoundaryScope;
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
    // Update state so the next render will show the fallback UI.
    //
    // `componentStack` IS IN THIS RETURN ON PURPOSE. Declaring the return as
    // `State` while returning two of its three fields was the standing TS2741
    // at this line, carried into slice 7g from 7f. Null is also the correct
    // VALUE rather than a type-satisfying filler: this runs BEFORE
    // componentDidCatch, which sets the real stack a moment later, so clearing
    // it here is what stops a second error from rendering the first one's
    // trace beneath it.
    return {
      hasError: true,
      error,
      componentStack: null,
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
    // ALL THREE FIELDS. `componentStack` was left behind here before slice 7g,
    // so a second, different error caught by the same boundary rendered the
    // PREVIOUS error's stack underneath it in a dev build.
    //
    // WHAT THIS DOES AND DOES NOT FIX. Clearing `hasError` remounts the
    // subtree - React unmounts the children when a boundary catches, so
    // rendering them again is a fresh mount with fresh state. That is a real
    // retry for a transient failure. It is NOT a retry for a malformed
    // document, which is the shape slices 7e and 7f guarded: the remount
    // re-reads the same bad data and throws again immediately. The way out of
    // that is the navigator chrome outside this boundary, not this button.
    this.setState({
      hasError: false,
      error: null,
      componentStack: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI or use provided fallback
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isSurface = this.props.scope === 'surface';

      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.emoji}>😔</Text>
            <Text style={styles.title}>
              {isSurface ? COPY.surfaceTitle : COPY.appTitle}
            </Text>
            {/* THE SECOND LINE IS APP-SCOPE ONLY. At surface scope the title
                plus Try Again is the whole message: the way out of a broken
                screen is the header's back button or the tab bar, both of
                which the navigator renders OUTSIDE this boundary and both of
                which survive the throw. Copy does not need to offer an exit
                that the chrome already provides. */}
            {!isSurface && <Text style={styles.message}>{COPY.appMessage}</Text>}
            {/* THE DIAGNOSTICS ARE DEV-ONLY (slice 7f). This block rendered
                `error.toString()` and eight lines of component stack to
                EVERY USER on every caught error, in production, above the
                Try Again button. That is a stack trace as user-facing copy:
                it names internal components and module paths, it is
                meaningless to the person reading it, and it makes a caught
                error look like a crash report the user is expected to act
                on. `logError` in componentDidCatch already sends the same
                information where it belongs.

                The MESSAGE AND THE BUTTON ARE UNCHANGED. The user-facing
                half of this screen is the same text in the same place in
                both builds; only the debug panel is gated, so a developer
                still sees on device exactly what they saw before. */}
            {__DEV__ && this.state.error && (
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
              <Text style={styles.buttonText}>{COPY.tryAgain}</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

/**
 * STYLES ARE UNCHANGED BY SLICE 7g, AND THE SURFACE SCOPE DELIBERATELY ADDS
 * NONE. It reuses container, content, title and button below, so the slice
 * introduces no token, radius, elevation or colour decision at all. The raw hex
 * literals here predate this slice and are part of the standing lint baseline;
 * sweeping them is a separate, visual change and is not in this fence.
 */
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

export { COPY as ERROR_BOUNDARY_COPY };
export default ErrorBoundary;
