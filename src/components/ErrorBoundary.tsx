import React, { Component, ReactNode } from 'react';

class AIErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 rounded-lg">
          <p className="text-red-700">AI Assistant encountered an error</p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AIErrorBoundary;
