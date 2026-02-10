import { Component, ErrorInfo, ReactNode } from 'react';
import { telemetry } from '../services/telemetry';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('[ErrorBoundary] Caught error:', error, errorInfo);

        // Report to telemetry
        telemetry.track('ui_crash', {
            error: error.message,
            stack: error.stack?.slice(0, 500),
            component: errorInfo.componentStack?.slice(0, 200)
        });
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="error-boundary-container">
                    <div className="error-boundary-content">
                        <div className="error-boundary-emoji">😵</div>
                        <h2 className="error-boundary-title">Something went wrong</h2>
                        <p className="error-boundary-desc">
                            {this.state.error?.message || 'An unexpected error occurred'}
                        </p>
                        <button
                            onClick={this.handleReset}
                            className="btn-primary"
                        >
                            Try Again
                        </button>
                    </div>
                    <style>{`
            .error-boundary-container {
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              padding: 24px;
              text-align: center;
              background: var(--bg-primary);
              color: var(--text-primary);
            }
            .error-boundary-emoji {
              font-size: 48px;
              margin-bottom: 16px;
            }
            .error-boundary-title {
              font-size: 20px;
              font-weight: 700;
              margin-bottom: 8px;
            }
            .error-boundary-desc {
              font-size: 14px;
              color: var(--text-secondary);
              margin-bottom: 24px;
              max-width: 300px;
            }
          `}</style>
                </div>
            );
        }

        return this.props.children;
    }
}
