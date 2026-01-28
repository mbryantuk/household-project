import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, Typography, Card, CardContent, CardActions, Button, 
  AspectRatio, Grid, Container, IconButton, Stack, Tooltip,
  Modal, ModalDialog, DialogTitle, DialogContent, DialogActions, FormControl, FormLabel, Input
} from '@mui/joy';
import { Add, ArrowForward, Logout, DeleteForever } from '@mui/icons-material';
import { getEmojiColor } from '../theme';

export default function HouseholdSelector({ api, currentUser, onLogout, showNotification }) {
  const [households, setHouseholds] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newHouseholdName, setNewHouseholdName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchHouseholds = useCallback(async () => {
    try {
      const res = await api.get('/auth/my-households');
      setHouseholds(res.data || []);
    } catch (err) {
      console.error("Failed to load households", err);
      showNotification("Failed to load your households", "danger");
    }
  }, [api, showNotification]);

  useEffect(() => {
    fetchHouseholds();
  }, [fetchHouseholds]);

  const handleSelect = async (hh) => {
    try {
      await api.post(`/households/${hh.id}/select`);
    } catch (err) {
      console.error("Failed to persist household preference", err);
    }
    localStorage.setItem('household', JSON.stringify(hh));
    window.location.href = `/household/${hh.id}/dashboard`;
  };

  const handleDeleteHousehold = async (e, hh) => {
    e.stopPropagation(); // Don't trigger card click
    
    const confirmed = window.confirm(`⚠️ PERMANENT ACTION: Are you sure you want to DELETE ${hh.name}? This will destroy all vehicles, assets, members and financial data for this household. This cannot be undone.`);
    
    if (confirmed) {
        try {
            await api.delete(`/households/${hh.id}`);
            showNotification(`Household "${hh.name}" deleted permanently.`, "success");
            fetchHouseholds();
        } catch (err) {
            console.error("Failed to delete household", err);
            showNotification("Failed to delete household. Only admins can perform this action.", "danger");
        }
    }
  };

  const handleCreateHousehold = async (e) => {
    e.preventDefault();
    if (!newHouseholdName.trim()) return;
    
    setIsSubmitting(true);
    try {
        const res = await api.post('/households', { 
          name: newHouseholdName
        });
        const newHh = res.data;
        showNotification(`Household "${newHouseholdName}" created!`, "success");
        setIsModalOpen(false);
        setNewHouseholdName('');
        
        // Success Flow: Auto-select and redirect
        localStorage.setItem('household', JSON.stringify(newHh));
        window.location.href = `/household/${newHh.id}/dashboard`;
    } catch (err) {
        console.error("Failed to create household", err);
        showNotification("Failed to create household.", "danger");
    } finally {
        setIsSubmitting(false);
    }
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
                position: 'relative',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 'md', borderColor: 'primary.outlinedBorder' }
            }} onClick={() => handleSelect(hh)}>
              
              {hh.role === 'admin' && (
                  <Tooltip title="Delete Household" variant="soft" color="danger">
                      <IconButton 
                        variant="plain" 
                        color="danger" 
                        size="sm"
                        sx={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}
                        onClick={(e) => handleDeleteHousehold(e, hh)}
                      >
                          <DeleteForever />
                      </IconButton>
                  </Tooltip>
              )}

              <AspectRatio ratio="1" variant="soft" sx={{ borderRadius: '50%', mb: 2, bgcolor: getEmojiColor(hh.avatar || '🏠') }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-center', fontSize: '2.5rem' }}>
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
              bgcolor: 'background.level1',
              cursor: 'pointer',
              '&:hover': { bgcolor: 'background.level2', borderColor: 'primary.outlinedBorder' }
          }} onClick={() => setIsModalOpen(true)}>
            <IconButton variant="soft" color="neutral" size="lg" sx={{ borderRadius: '50%', mb: 2 }}>
                <Add />
            </IconButton>
            <Typography level="title-md">New Household</Typography>
            <Typography level="body-xs" textAlign="center" sx={{ px: 2 }}>Register a new tenant property</Typography>
            <Button variant="plain" sx={{ mt: 2 }} onClick={() => setIsModalOpen(true)}>Get Started</Button>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <Button variant="plain" color="neutral" startDecorator={<Logout />} onClick={onLogout}>Logout</Button>
      </Box>

      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <ModalDialog>
          <DialogTitle>Create New Household</DialogTitle>
          <DialogContent>Enter a name for your new household property.</DialogContent>
          <form onSubmit={handleCreateHousehold}>
            <Stack spacing={2}>
              <FormControl required>
                <FormLabel>Household Name</FormLabel>
                <Input 
                    autoFocus 
                    placeholder="e.g. Summer House, Beach Cabin" 
                    value={newHouseholdName}
                    onChange={(e) => setNewHouseholdName(e.target.value)}
                />
              </FormControl>
              <DialogActions>
                <Button type="submit" loading={isSubmitting}>Create Household</Button>
                <Button variant="plain" color="neutral" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              </DialogActions>
            </Stack>
          </form>
        </ModalDialog>
      </Modal>
    </Container>
  );
}