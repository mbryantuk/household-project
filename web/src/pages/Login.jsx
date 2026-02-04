import { useState, useEffect, useCallback } from 'react';
import { 
  Box, Sheet, Typography, Input, Button, Alert, Link, Checkbox, FormControl, FormLabel, Avatar, IconButton, Stack
} from '@mui/joy';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { ArrowBack, Visibility, VisibilityOff, Email, Lock } from '@mui/icons-material';
import axios from 'axios';
import MantelIcon from '../components/MantelIcon';
import { getEmojiColor } from '../theme';

export default function Login({ onLogin }) {
  const location = useLocation();
  const [step, setStep] = useState(1); // 1: Email, 2: Password
  const [email, setEmail] = useState(localStorage.getItem('rememberedEmail') || '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(localStorage.getItem('rememberMe') === 'true');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Personalized data
  const [userProfile, setUserProfile] = useState(null);

  const message = location.state?.message;

  const handleLookup = useCallback(async (e) => {
    if (e) e.preventDefault();
    if (!email) return;
    
    setError('');
    setLoading(true);
    try {
        const res = await axios.post(`${window.location.origin}/api/auth/lookup`, { email });
        setUserProfile(res.data);
        setStep(2);
    } catch (err) {
        // If not found, just let them try to login normally (might be a new user or different error)
        if (err.response?.status === 404) {
            setStep(2); // Still go to password, let login handle the actual auth error
        } else {
            setError("Unable to connect to service.");
        }
    } finally {
        setLoading(false);
    }
  }, [email]);

  // Auto-advance if we have a remembered email
  useEffect(() => {
    if (localStorage.getItem('rememberMe') === 'true' && email && step === 1) {
       handleLookup();
    }
  }, [email, step, handleLookup]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await onLogin(email, password, rememberMe);
      
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
        localStorage.setItem('rememberMe', 'true');
      } else {
        localStorage.removeItem('rememberedEmail');
        localStorage.setItem('rememberMe', 'false');
      }
    } catch (err) {
      console.error("Login failed:", err);
      if (err.response && err.response.status === 503) {
          setError(err.response.data.message || "System Upgrade in Progress.");
      } else if (err.response && err.response.status === 401 || err.response?.status === 404) {
          setError("Invalid email or password.");
      } else {
          setError("Login failed. Please check your connection.");
      }
      setLoading(false); 
    }
  };

  const handleBack = () => {
      setStep(1);
      setPassword('');
      setUserProfile(null);
      setError('');
  };

  return (
    <Box sx={{ 
        display: 'flex', 
        minHeight: '100vh', 
        alignItems: 'center', 
        justifyContent: 'center', 
        bgcolor: 'background.body', 
        p: 2,
        backgroundImage: 'radial-gradient(circle at 50% 50%, var(--joy-palette-primary-softBg) 0%, var(--joy-palette-background-body) 100%)'
    }}>
      <Sheet 
        variant="outlined"
        sx={{ 
          p: { xs: 3, md: 5 }, 
          width: '100%', 
          maxWidth: 420, 
          textAlign: 'center', 
          borderRadius: 'xl',
          boxShadow: 'xl',
          bgcolor: 'background.surface',
          border: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Box sx={{ mb: 1, display: 'flex', justifyContent: 'center' }}>
            <MantelIcon colorway="default" sx={{ fontSize: 48 }} />
        </Box>
        <Typography level="h3" sx={{ fontWeight: 'xl', mb: 0.5, letterSpacing: '0.1em' }}>MANTEL</Typography>
        <Typography level="body-xs" color="neutral" sx={{ mb: 4, textTransform: 'uppercase', fontWeight: 'bold' }}>Household Management</Typography>

        {message && <Alert color="success" variant="soft" sx={{ mb: 3, textAlign: 'left' }}>{message}</Alert>}
        {error && <Alert color="danger" variant="soft" sx={{ mb: 3, textAlign: 'left' }}>{error}</Alert>}

        {step === 1 ? (
          <form onSubmit={handleLookup}>
            <Typography level="h4" sx={{ mb: 1, textAlign: 'left' }}>Sign In</Typography>
            <Typography level="body-sm" sx={{ mb: 3, textAlign: 'left' }}>Use your Mantel account</Typography>
            
            <FormControl required sx={{ mb: 3 }}>
              <FormLabel>Email Address</FormLabel>
              <Input 
                autoFocus
                type="email" 
                placeholder="name@example.com"
                startDecorator={<Email sx={{ color: 'neutral.400' }} />}
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                disabled={loading}
                size="lg"
                variant="outlined"
              />
            </FormControl>

            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
                <Checkbox 
                  label="Remember this device" 
                  checked={rememberMe} 
                  onChange={(e) => setRememberMe(e.target.checked)} 
                  size="sm" 
                />
                <Link component={RouterLink} to="/register" level="body-sm" sx={{ fontWeight: 'lg' }}>Create Account</Link>
            </Stack>

            <Button 
              fullWidth type="submit" variant="solid" size="lg" 
              loading={loading}
              sx={{ borderRadius: 'md' }}
            >
              Next
            </Button>
          </form>
        ) : (
          <form onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
                <Box sx={{ position: 'relative', mb: 2 }}>
                    <Avatar 
                        size="lg" 
                        sx={{ 
                            '--Avatar-size': '80px', 
                            fontSize: '2rem', 
                            bgcolor: getEmojiColor(userProfile?.avatar || email[0], false),
                            boxShadow: 'sm'
                        }}
                    >
                        {userProfile?.avatar || email[0].toUpperCase()}
                    </Avatar>
                    <IconButton 
                        size="sm" 
                        variant="soft" 
                        color="neutral" 
                        onClick={handleBack}
                        sx={{ position: 'absolute', top: 0, left: -40, borderRadius: '50%' }}
                    >
                        <ArrowBack />
                    </IconButton>
                </Box>
                <Typography level="h4" sx={{ mb: 0.5 }}>Welcome back{userProfile?.first_name ? `, ${userProfile.first_name}` : ''}</Typography>
                <Typography level="body-sm" color="neutral" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {email} 
                    <Link onClick={handleBack} level="body-xs" underline="hover" sx={{ cursor: 'pointer' }}>Not you?</Link>
                </Typography>
            </Box>

            <FormControl required sx={{ mb: 4 }}>
              <FormLabel>Password</FormLabel>
              <Input 
                autoFocus
                type={showPassword ? "text" : "password"} 
                placeholder="Enter password"
                startDecorator={<Lock sx={{ color: 'neutral.400' }} />}
                endDecorator={
                    <IconButton onClick={() => setShowPassword(!showPassword)} size="sm" variant="plain" color="neutral">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                }
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                disabled={loading}
                size="lg"
              />
            </FormControl>

            <Button 
              fullWidth type="submit" variant="solid" size="lg" 
              loading={loading}
              sx={{ borderRadius: 'md' }}
            >
              Log In
            </Button>
          </form>
        )}

        <Box sx={{ mt: 4, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography level="body-xs" color="neutral">
                &copy; {new Date().getFullYear()} Mantel Household Systems. All rights reserved.
            </Typography>
        </Box>
      </Sheet>
    </Box>
  );
}