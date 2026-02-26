import { useState } from 'react';
import { Box, Typography, Stack, Card, Alert, Link } from '@mui/joy';
import { Link as RouterLink } from 'react-router-dom';
import axios from 'axios';
import { APP_NAME } from '../constants';
import AppButton from '../components/ui/AppButton';
import AppInput from '../components/ui/AppInput';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await axios.post(`${window.location.origin}/api/auth/forgot-password`, { email });
      setMessage('If an account exists with that email, a reset link has been sent.');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        height: '100dvh',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.level1',
      }}
    >
      <Stack spacing={3} sx={{ width: 400, maxWidth: '95vw' }}>
        <Typography level="h2" textAlign="center">
          {APP_NAME}
        </Typography>

        <Card variant="outlined">
          <Typography level="title-md" mb={1}>
            Reset Password
          </Typography>
          <Typography level="body-sm" mb={2}>
            Enter your email address and we'll send you a link to reset your password.
          </Typography>

          {message && (
            <Alert color="success" sx={{ mb: 2 }}>
              {message}
            </Alert>
          )}

          {error && (
            <Alert color="danger" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {!message && (
            <form onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <AppInput
                  placeholder="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
                <AppButton type="submit" loading={loading} fullWidth>
                  Send Reset Link
                </AppButton>
              </Stack>
            </form>
          )}

          <Typography level="body-xs" textAlign="center" mt={2}>
            Remembered your password?{' '}
            <Link component={RouterLink} to="/login">
              Back to Login
            </Link>
          </Typography>
        </Card>
      </Stack>
    </Box>
  );
}
