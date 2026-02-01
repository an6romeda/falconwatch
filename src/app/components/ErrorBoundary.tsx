"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-space-navy flex items-center justify-center p-4">
          <div className="retro-panel p-8 max-w-lg text-center">
            <div className="text-4xl mb-4">🚀</div>
            <h1
              className="text-2xl font-bold text-retro-orange mb-4"
              style={{ fontFamily: "var(--font-orbitron)" }}
            >
              Houston, We Have a Problem
            </h1>
            <p className="text-off-white/70 mb-6">
              Something went wrong while loading the page. This has been logged
              and we&apos;re working on it.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="retro-button-orange px-6 py-3 font-mono text-sm uppercase tracking-wider"
            >
              Retry Launch
            </button>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-off-white/50 cursor-pointer text-sm">
                  Error Details
                </summary>
                <pre className="mt-2 p-4 bg-black/50 rounded text-xs text-red-400 overflow-auto">
                  {this.state.error.message}
                  {"\n\n"}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
