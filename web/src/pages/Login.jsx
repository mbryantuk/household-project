import { useState } from 'react';
import axios from 'axios';
import { Box, Typography, Stack, Card, Link, Button, Divider } from '@mui/joy';
import { Link as RouterLink } from 'react-router-dom';
import { startAuthentication } from '@simplewebauthn/browser';
import { APP_NAME } from '../constants';
import AppButton from '../components/ui/AppButton';
import AppInput from '../components/ui/AppInput';
import Fingerprint from '@mui/icons-material/Fingerprint';

export default function Login({ onLogin, onMfaLogin, onPasskeyLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mfaData, setMfaData] = useState(null);
  const [mfaCode, setMfaDataCode] = useState('');

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

  const handlePasskeyLogin = async () => {
    if (!email) {
      setError('Please enter your email first to use a passkey.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // 1. Get options from server
      const { data: options } = await axios.get(
        `${window.location.origin}/api/passkeys/login/options?email=${email}`
      );

      // 2. Start authentication with browser
      const assertion = await startAuthentication({ optionsJSON: options });

      // 3. Verify with server using shared context logic
      await onPasskeyLogin(email, assertion);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Passkey login failed');
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
          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              {!mfaData ? (
                <>
                  <AppInput
                    placeholder="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                  <AppInput
                    placeholder="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Link component={RouterLink} to="/forgot-password" level="body-xs">
                      Forgot Password?
                    </Link>
                  </Box>
                </>
              ) : (
                <>
                  <Typography level="body-sm">Enter 2FA Code</Typography>
                  <AppInput
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
              <AppButton type="submit" loading={loading} fullWidth>
                {mfaData ? 'Verify Code' : 'Login'}
              </AppButton>

              {!mfaData && (
                <>
                  <Divider>or</Divider>
                  <Button
                    variant="soft"
                    color="neutral"
                    startDecorator={<Fingerprint />}
                    onClick={handlePasskeyLogin}
                    disabled={loading}
                  >
                    Login with Passkey
                  </Button>
                </>
              )}
            </Stack>
          </form>

          <Typography level="body-xs" textAlign="center" mt={3}>
            Don't have an account?{' '}
            <Link component={RouterLink} to="/register">
              Create Household
            </Link>
          </Typography>
        </Card>
      </Stack>
    </Box>
  );
}
