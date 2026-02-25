import React from 'react';
import { Box, Typography, Button, Sheet } from '@mui/joy';
import { Warning, Refresh } from '@mui/icons-material';

/**
 * Item 176: Graceful Degradation
 * Catches runtime errors in the React tree and provides a recovery UI.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught exception:', error, errorInfo);
    // Future: Push to Sentry/PostHog
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            height: '100dvh',
            width: '100vw',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.body',
            p: 3,
          }}
        >
          <Sheet
            variant="outlined"
            sx={{
              maxWidth: 500,
              width: '100%',
              p: 4,
              borderRadius: 'lg',
              textAlign: 'center',
              boxShadow: 'xl',
            }}
          >
            <Warning sx={{ fontSize: '4rem', color: 'danger.solidBg', mb: 2 }} />
            <Typography level="h3" mb={1}>
              Something went wrong
            </Typography>
            <Typography level="body-md" color="neutral" mb={3}>
              An unexpected error occurred. We've been notified and are looking into it.
            </Typography>
            <Button
              variant="solid"
              color="primary"
              startDecorator={<Refresh />}
              onClick={() => window.location.reload()}
            >
              Reload Application
            </Button>
          </Sheet>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
