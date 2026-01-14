import { useState } from 'react';
import axios from 'axios';
import { 
  Box, Sheet, Typography, Input, Button, Alert, Link, FormControl, FormLabel, Stack, Avatar, IconButton
} from '@mui/joy';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import TotemIcon from '../components/TotemIcon';
import EmojiPicker from '../components/EmojiPicker';
import { PhotoCamera } from '@mui/icons-material';

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    householdName: '',
    avatar: '👤'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  const API_URL = window.location.origin;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/auth/register`, {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        householdName: formData.householdName,
        avatar: formData.avatar
      });
      navigate('/login', { state: { message: "Registration successful! Please login." } });
    } catch (err) {
      console.error("Registration error:", err);
      setError(err.response?.data?.error || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      bgcolor: 'background.body',
      p: 2
    }}>
      <Sheet 
        variant="outlined" 
        sx={{ 
          p: 4, 
          width: '100%', 
          maxWidth: 500, 
          borderRadius: 'md', 
          textAlign: 'center',
          boxShadow: 'md' 
        }}
      >
        <TotemIcon sx={{ fontSize: 50, mb: 2 }} colorway="default" />
        <Typography level="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
          Create your Household
        </Typography>
        <Typography level="body-sm" color="neutral" sx={{ mb: 3 }}>
          Start your journey with Totem.
        </Typography>

        {error && <Alert color="danger" sx={{ mb: 3, textAlign: 'left' }}>{error}</Alert>}

        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <Box sx={{ position: 'relative' }}>
                <Avatar 
                  size="lg" 
                  sx={{ 
                    '--Avatar-size': '100px', 
                    fontSize: '2.5rem', 
                    cursor: 'pointer',
                    '&:hover': { transform: 'scale(1.05)' },
                    transition: 'transform 0.2s'
                  }}
                  onClick={() => setEmojiPickerOpen(true)}
                >
                  {formData.avatar}
                </Avatar>
                <IconButton
                  size="sm"
                  variant="solid"
                  color="primary"
                  sx={{ 
                    position: 'absolute', 
                    bottom: 0, 
                    right: 0, 
                    borderRadius: '50%',
                    boxShadow: 'sm' 
                  }}
                  onClick={() => setEmojiPickerOpen(true)}
                >
                  <PhotoCamera />
                </IconButton>
              </Box>
            </Box>

            <Stack direction="row" spacing={2}>
              <FormControl required sx={{ flex: 1 }}>
                <FormLabel>First Name</FormLabel>
                <Input name="firstName" value={formData.firstName} onChange={handleChange} />
              </FormControl>
              <FormControl required sx={{ flex: 1 }}>
                <FormLabel>Last Name</FormLabel>
                <Input name="lastName" value={formData.lastName} onChange={handleChange} />
              </FormControl>
            </Stack>

            <FormControl required>
              <FormLabel>Email Address</FormLabel>
              <Input type="email" name="email" value={formData.email} onChange={handleChange} />
            </FormControl>

            <FormControl required>
              <FormLabel>Household Name</FormLabel>
              <Input name="householdName" placeholder="e.g. The Smith Family" value={formData.householdName} onChange={handleChange} />
            </FormControl>

            <FormControl required>
              <FormLabel>Password</FormLabel>
              <Input type="password" name="password" value={formData.password} onChange={handleChange} />
            </FormControl>

            <FormControl required>
              <FormLabel>Confirm Password</FormLabel>
              <Input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} />
            </FormControl>

            <Button type="submit" variant="solid" size="lg" loading={loading} sx={{ mt: 2 }}>
              Register
            </Button>
          </Stack>

          <Typography level="body-sm" sx={{ mt: 2 }}>
            Already have an account? <Link component={RouterLink} to="/login">Log In</Link>
          </Typography>
        </form>
      </Sheet>

      <EmojiPicker 
        open={emojiPickerOpen} 
        onClose={() => setEmojiPickerOpen(false)} 
        onEmojiSelect={(emoji) => {
          setFormData({...formData, avatar: emoji});
          setEmojiPickerOpen(false);
        }}
        title="Choose Avatar Emoji"
      />
    </Box>
  );
}