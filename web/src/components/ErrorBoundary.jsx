import React from 'react';
import { Card, Typography, Button, Box, Sheet, Stack } from '@mui/joy';
import { WarningAmber, BugReport } from '@mui/icons-material';

/**
 * Standard Error Boundary for Dashboard Widgets to prevent full-page crashes.
 * Enhanced with detailed debug logging for troubleshooting.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Widget Crash Detected:", error, errorInfo);
    this.setState({ errorInfo });
    
    // Log more details to the console for easier tracing in Playwright
    if (error && error.stack) {
        console.log("[DEBUG] Error Stack:", error.stack);
    }
    if (errorInfo && errorInfo.componentStack) {
        console.log("[DEBUG] Component Stack:", errorInfo.componentStack);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card 
          variant="soft" 
          color="danger" 
          sx={{ 
            height: '100%', 
            minHeight: 200,
            justifyContent: 'center', 
            alignItems: 'center',
            textAlign: 'center',
            gap: 1.5,
            p: 2,
            overflow: 'auto'
          }}
        >
          <WarningAmber sx={{ fontSize: '2rem' }} />
          <Box>
            <Typography level="title-md">Widget Crashed</Typography>
            <Typography level="body-xs" sx={{ mt: 0.5, mb: 1.5, opacity: 0.8 }}>
              This component failed to render. A trace has been sent to the console.
            </Typography>
          </Box>

          <Sheet 
            variant="outlined" 
            color="danger" 
            sx={{ 
                p: 1, 
                borderRadius: 'sm', 
                bgcolor: 'background.surface', 
                width: '100%', 
                textAlign: 'left',
                maxHeight: 100,
                overflow: 'auto'
            }}
          >
            <Typography level="body-xs" component="pre" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', color: 'danger.plainColor' }}>
                {this.state.error?.toString()}
            </Typography>
          </Sheet>

          <Stack direction="row" spacing={1}>
            <Button 
                size="sm" 
                variant="solid" 
                color="danger" 
                onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
            >
                Try Again
            </Button>
            <Button 
                size="sm" 
                variant="outlined" 
                color="danger" 
                startDecorator={<BugReport />}
                onClick={() => {
                    console.log("Full Error Context:", {
                        error: this.state.error,
                        stack: this.state.error?.stack,
                        componentStack: this.state.errorInfo?.componentStack
                    });
                    alert("Debug info printed to console.");
                }}
            >
                Log Trace
            </Button>
          </Stack>
        </Card>
      );
    }

    return this.props.children;
  }
}