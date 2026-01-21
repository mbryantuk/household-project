import { useState } from 'react';
import { 
  Box, Sheet, Typography, Input, Button, Alert, Link, Checkbox, FormControl, FormLabel 
} from '@mui/joy';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import TotemIcon from '../components/TotemIcon';

export default function Login({ onLogin }) {
  const location = useLocation();
  const [email, setEmail] = useState(localStorage.getItem('rememberedEmail') || '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(localStorage.getItem('rememberMe') === 'true');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const message = location.state?.message;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await onLogin(email, password);
      
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
        localStorage.setItem('rememberMe', 'true');
      } else {
        localStorage.removeItem('rememberedEmail');
        localStorage.setItem('rememberMe', 'false');
      }
    } catch (err) {
      console.error("Login failed:", err);
      if (err.response && err.response.status === 404) setError("User not found.");
      else if (err.response && err.response.status === 401) setError("Incorrect password.");
      else setError("Login failed. Please check your connection.");
      setLoading(false); 
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.body', p: 2 }}>
      <Sheet 
        variant="outlined"
        sx={{ 
          p: 4, 
          width: '100%', 
          maxWidth: 400, 
          textAlign: 'center', 
          borderRadius: 'md',
          boxShadow: 'md'
        }}
      >
        <Box sx={{ mb: 2 }}><TotemIcon colorway="default" sx={{ fontSize: 60 }} /></Box>
        <Typography level="h3" sx={{ fontWeight: 'bold', mb: 1 }}>TOTEM</Typography>
        <Typography level="body-sm" color="neutral" sx={{ mb: 3 }}>Household Management</Typography>

        {message && <Alert color="success" sx={{ mb: 2, textAlign: 'left' }}>{message}</Alert>}
        {error && <Alert color="danger" sx={{ mb: 2, textAlign: 'left' }}>{error}</Alert>}

        <form onSubmit={handleSubmit}>
          <FormControl required sx={{ mb: 2 }}>
            <FormLabel>Email Address</FormLabel>
            <Input 
              type="email" 
              value={email} onChange={e => setEmail(e.target.value)} disabled={loading} 
            />
          </FormControl>
          
          <FormControl required sx={{ mb: 2 }}>
            <FormLabel>Password</FormLabel>
            <Input 
              type="password" 
              value={password} onChange={e => setPassword(e.target.value)} disabled={loading} 
            />
          </FormControl>
          
          <Box sx={{ textAlign: 'left', mt: 1 }}>
            <Checkbox 
              label="Remember me" 
              checked={rememberMe} 
              onChange={(e) => setRememberMe(e.target.checked)} 
              size="sm" 
            />
          </Box>

          <Button 
            fullWidth type="submit" variant="solid" size="lg" sx={{ mt: 3, mb: 2 }} 
            loading={loading}
          >
            Log In
          </Button>

          <Typography level="body-sm">
            Need an account? <Link component={RouterLink} to="/register">Create Household</Link>
          </Typography>
        </form>
      </Sheet>
    </Box>
  );
}
