import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Card, CardContent, CardActions, Button, 
  AspectRatio, Grid, Container, IconButton, Stack, Divider, Sheet, Alert
} from '@mui/joy';
import { Add, Home, ArrowForward, Logout, Settings } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getEmojiColor } from '../theme';

export default function HouseholdSelector({ api, currentUser, onLogout, showNotification }) {
  const [households, setHouseholds] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchHouseholds();
  }, []);

  const fetchHouseholds = async () => {
    try {
      const res = await api.get('/auth/my-households');
      setHouseholds(res.data || []);
    } catch (err) {
      showNotification("Failed to load your households", "danger");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (hh) => {
    localStorage.setItem('household', JSON.stringify(hh));
    window.location.href = `/household/${hh.id}/dashboard`;
  };

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Box sx={{ mb: 6, textAlign: 'center' }}>
        <Typography level="h1" fontWeight="xl" mb={1}>Welcome back, {currentUser?.first_name || currentUser?.username}</Typography>
        <Typography level="title-lg" textColor="text.secondary">Select a household to continue</Typography>
      </Box>

      <Grid container spacing={3} justifyContent="center">
        {households.map((hh) => (
          <Grid key={hh.id} xs={12} sm={6} md={4}>
            <Card variant="outlined" sx={{ 
                '--Card-padding': '24px', 
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 'md', borderColor: 'primary.outlinedBorder' }
            }} onClick={() => handleSelect(hh)}>
              <AspectRatio ratio="1" variant="soft" sx={{ borderRadius: '50%', mb: 2, bgcolor: getEmojiColor(hh.avatar || '🏠') }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem' }}>
                    {hh.avatar || '🏠'}
                </Box>
              </AspectRatio>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography level="title-lg">{hh.name}</Typography>
                <Typography level="body-xs" textColor="text.tertiary">Role: {hh.role?.toUpperCase()}</Typography>
              </CardContent>
              <CardActions sx={{ justifyContent: 'center', mt: 1 }}>
                <Button variant="soft" color="primary" endDecorator={<ArrowForward />}>Open</Button>
              </CardActions>
            </Card>
          </Grid>
        ))}

        <Grid xs={12} sm={6} md={4}>
          <Card variant="dashed" sx={{ 
              '--Card-padding': '24px', 
              height: '100%', justifyContent: 'center', alignItems: 'center',
              bgcolor: 'background.level1'
          }}>
            <IconButton variant="soft" color="neutral" size="lg" sx={{ borderRadius: '50%', mb: 2 }}>
                <Add />
            </IconButton>
            <Typography level="title-md">New Household</Typography>
            <Typography level="body-xs" textAlign="center" sx={{ px: 2 }}>Register a new tenant property</Typography>
            <Button variant="plain" sx={{ mt: 2 }} onClick={() => navigate('/register')}>Get Started</Button>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <Button variant="plain" color="neutral" startDecorator={<Logout />} onClick={onLogout}>Logout</Button>
        {currentUser?.system_role === 'sysadmin' && (
            <Alert variant="soft" color="warning" size="sm" sx={{ py: 0.5 }}>
                System Admin Access Enabled
            </Alert>
        )}
      </Box>
    </Container>
  );
}