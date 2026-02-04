import React from 'react';
import { Card, Typography, Button, Box } from '@mui/joy';
import { WarningAmber } from '@mui/icons-material';

/**
 * Standard Error Boundary for Dashboard Widgets to prevent full-page crashes.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Widget Crash Detected:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card 
          variant="soft" 
          color="danger" 
          sx={{ 
            height: '100%', 
            minHeight: 150,
            justifyContent: 'center', 
            alignItems: 'center',
            textAlign: 'center',
            gap: 1.5,
            p: 2
          }}
        >
          <WarningAmber sx={{ fontSize: '2rem' }} />
          <Box>
            <Typography level="title-md">Widget Crashed</Typography>
            <Typography level="body-xs" sx={{ mt: 0.5, mb: 1.5, opacity: 0.8 }}>
              This component failed to render correctly.
            </Typography>
          </Box>
          <Button 
            size="sm" 
            variant="solid" 
            color="danger" 
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try Again
          </Button>
        </Card>
      );
    }

    return this.props.children;
  }
}
