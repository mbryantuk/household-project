import { useState } from 'react';
import { Box, Typography, Stack, Card, Alert, Link } from '@mui/joy';
import { useNavigate, useSearchParams, Link as RouterLink } from 'react-router-dom';
import axios from 'axios';
import { APP_NAME } from '../constants';
import AppButton from '../components/ui/AppButton';
import AppInput from '../components/ui/AppInput';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await axios.post(`${window.location.origin}/api/auth/reset-password`, {
        token,
        password,
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired token');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <Box
        sx={{ display: 'flex', height: '100dvh', alignItems: 'center', justifyContent: 'center' }}
      >
        <Alert color="danger">Invalid reset link. Please request a new one.</Alert>
      </Box>
    );
  }

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
            Set New Password
          </Typography>

          {success ? (
            <Stack spacing={2}>
              <Alert color="success">Password reset successful! Redirecting to login...</Alert>
              <AppButton onClick={() => navigate('/login')}>Go to Login Now</AppButton>
            </Stack>
          ) : (
            <form onSubmit={handleSubmit}>
              <Stack spacing={2}>
                {error && <Alert color="danger">{error}</Alert>}
                <AppInput
                  placeholder="New Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                />
                <AppInput
                  placeholder="Confirm New Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <AppButton type="submit" loading={loading} fullWidth>
                  Reset Password
                </AppButton>
              </Stack>
            </form>
          )}
        </Card>
      </Stack>
    </Box>
  );
}
