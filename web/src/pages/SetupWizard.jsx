import { useState } from 'react';
import axios from 'axios';
import { 
  Box, 
  Card, 
  Typography, 
  TextField, 
  Button, 
  Stepper, 
  Step, 
  StepLabel,
  CircularProgress,
  Alert
} from '@mui/material';
import TotemIcon from '../components/TotemIcon';

export default function SetupWizard({ onComplete }) {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    username: 'Admin',
    password: '',
    confirmPassword: '',
    householdName: ''
  });

  const getApiUrl = () => {
    return window.location.hostname === 'localhost' || window.location.hostname.includes('10.10')
      ? `http://${window.location.hostname}:4001` 
      : window.location.origin;
  };

  const steps = ['Admin Account', 'Household Details', 'Finalize'];

  const handleNext = () => {
    if (activeStep === 0 && (formData.password !== formData.confirmPassword)) {
      setError("Passwords do not match");
      return;
    }
    setError('');
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    const API_URL = getApiUrl();
    try {
      await axios.post(`${API_URL}/setup`, {
        username: formData.username,
        password: formData.password,
        householdName: formData.householdName
      });
      
      onComplete();
    } catch (err) {
      console.error("Setup error:", err);
      setError(err.response?.data?.error || "Failed to complete setup. Check backend logs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      bgcolor: 'background.default',
      p: 2
    }}>
      <Card sx={{ p: 4, width: '100%', maxWidth: 500, borderRadius: 4, textAlign: 'center' }}>
        <TotemIcon sx={{ fontSize: 50, mb: 2 }} colorway="default" />
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Welcome to Totem
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Let's get your household system running.
        </Typography>

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        <Box sx={{ textAlign: 'left', minHeight: 200 }}>
          {activeStep === 0 && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>Create Administrator</Typography>
              <TextField 
                fullWidth label="Admin Username" margin="normal" 
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
              />
              <TextField 
                fullWidth type="password" label="Admin Password" margin="normal" 
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
              <TextField 
                fullWidth type="password" label="Confirm Password" margin="normal" 
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
              />
            </Box>
          )}

          {activeStep === 1 && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>Household Name</Typography>
              <TextField 
                fullWidth label="e.g., Bryant Home" margin="normal" autoFocus
                value={formData.householdName}
                onChange={(e) => setFormData({...formData, householdName: e.target.value})}
              />
              <Typography variant="caption" color="text.secondary">
                You can change this and add more households later.
              </Typography>
            </Box>
          )}

          {activeStep === 2 && (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h6" gutterBottom>Ready to go!</Typography>
              <Typography variant="body2">
                Clicking finish will initialize your database and create your admin account.
              </Typography>
            </Box>
          )}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button disabled={activeStep === 0 || loading} onClick={handleBack}>
            Back
          </Button>
          {activeStep === steps.length - 1 ? (
            <Button variant="contained" onClick={handleSubmit} disabled={loading}>
              {loading ? <CircularProgress size={24} /> : 'Finish'}
            </Button>
          ) : (
            <Button variant="contained" onClick={handleNext}>
              Next
            </Button>
          )}
        </Box>
      </Card>
    </Box>
  );
}