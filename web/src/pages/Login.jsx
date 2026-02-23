import { useState } from 'react';
import { Box, Button, Input, Typography, Stack, Card, Divider } from '@mui/joy';
import { SignIn } from '@clerk/clerk-react';
import { APP_NAME } from '../constants';

export default function Login({ onLogin, onMfaLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mfaData, setMfaData] = useState(null);
  const [mfaCode, setMfaDataCode] = useState('');

  const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (mfaData) {
        await onMfaLogin(mfaData.preAuthToken, mfaCode);
      } else {
        const res = await onLogin(email, password, true);
        if (res?.mfa_required) {
          setMfaData(res);
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
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

        {clerkKey && (
          <>
            <SignIn routing="hash" />
            <Divider>or legacy login</Divider>
          </>
        )}

        <Card variant="outlined">
          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              {!mfaData ? (
                <>
                  <Input
                    placeholder="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <Input
                    placeholder="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </>
              ) : (
                <>
                  <Typography level="body-sm">Enter 2FA Code</Typography>
                  <Input
                    placeholder="000000"
                    value={mfaCode}
                    onChange={(e) => setMfaDataCode(e.target.value)}
                    required
                  />
                </>
              )}
              {error && (
                <Typography color="danger" level="body-xs">
                  {error}
                </Typography>
              )}
              <Button type="submit" loading={loading} fullWidth>
                {mfaData ? 'Verify Code' : 'Login'}
              </Button>
            </Stack>
          </form>
        </Card>
      </Stack>
    </Box>
  );
}
