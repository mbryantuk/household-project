import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, Typography, Card, CardContent, CardActions, Button, 
  AspectRatio, Grid, Container, IconButton, Stack, Tooltip,
  Modal, ModalDialog, DialogTitle, DialogContent, DialogActions, FormControl, FormLabel, Input
} from '@mui/joy';
import Add from '@mui/icons-material/Add';
import ArrowForward from '@mui/icons-material/ArrowForward';
import Logout from '@mui/icons-material/Logout';
import DeleteForever from '@mui/icons-material/DeleteForever';
import FileDownload from '@mui/icons-material/FileDownload';
import DataObject from '@mui/icons-material/DataObject';
import { useNavigate } from 'react-router-dom';
import { getEmojiColor } from '../theme';

export default function HouseholdSelector({ api, currentUser, onLogout, showNotification, onSelectHousehold }) {
  const navigate = useNavigate();
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
    if (onSelectHousehold) await onSelectHousehold(hh);
    navigate(`/household/${hh.id}/dashboard`);
  };

  const handleDeleteHousehold = async (e, hh) => {
    e.stopPropagation();
    const confirmed = window.confirm(`⚠️ Are you sure you want to DELETE ${hh.name}? This action is permanent.`);
    if (confirmed) {
        try {
            await api.delete(`/households/${hh.id}`);
            showNotification(`Household "${hh.name}" deleted.`, "success");
            fetchHouseholds();
        } catch (error) {
            console.error(error);
            showNotification("Failed to delete household.", "danger");
        }
    }
  };

  const handleExportHousehold = async (e, hh) => {
    e.stopPropagation();
    showNotification(`Preparing export for ${hh.name}...`, "neutral");
    try {
        // 1. Trigger Backup
        const createRes = await api.post(`/households/${hh.id}/backups`);
        const { filename } = createRes.data;

        // 2. Download File
        const downloadRes = await api.get(`/households/${hh.id}/backups/${filename}`, { responseType: 'blob' });
        
        // 3. Trigger Browser Download
        const url = window.URL.createObjectURL(new Blob([downloadRes.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        
        showNotification(`Export complete: ${filename}`, "success");
    } catch (err) {
        console.error("Export failed", err);
        showNotification("Failed to export household.", "danger");
    }
  };

  const handleExportJSON = async (e, hh) => {
    e.stopPropagation();
    showNotification(`Generating JSON export for ${hh.name}...`, "neutral");
    try {
        const res = await api.get(`/export/${hh.id}`, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        const timestamp = new Date().toISOString().split('T')[0];
        link.setAttribute('download', `totem-export-hh${hh.id}-${timestamp}.json`);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        showNotification(`JSON Export complete`, "success");
    } catch (err) {
        console.error("JSON Export failed", err);
        showNotification("Failed to export JSON.", "danger");
    }
  };

  const handleCreateHousehold = async (e) => {
    e.preventDefault();
    if (!newHouseholdName.trim()) return;
    
    setIsSubmitting(true);
    try {
        const res = await api.post('/households', { name: newHouseholdName });
        const newHh = res.data;
        showNotification(`Household "${newHouseholdName}" created!`, "success");
        setIsModalOpen(false);
        setNewHouseholdName('');
        if (onSelectHousehold) await onSelectHousehold(newHh);
        navigate(`/household/${newHh.id}/dashboard`);
    } catch (error) {
        console.error(error);
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
                  <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 2, display: 'flex', gap: 0.5 }}>
                      <Tooltip title="Export Data (ZIP)" variant="soft" color="primary">
                          <IconButton 
                            variant="plain" 
                            color="primary" 
                            size="sm"
                            onClick={(e) => handleExportHousehold(e, hh)}
                          >
                              <FileDownload />
                          </IconButton>
                      </Tooltip>
                      <Tooltip title="Export Data (JSON)" variant="soft" color="primary">
                          <IconButton 
                            variant="plain" 
                            color="primary" 
                            size="sm"
                            onClick={(e) => handleExportJSON(e, hh)}
                          >
                              <DataObject />
                          </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Household" variant="soft" color="danger">
                          <IconButton 
                            variant="plain" 
                            color="danger" 
                            size="sm"
                            onClick={(e) => handleDeleteHousehold(e, hh)}
                          >
                              <DeleteForever />
                          </IconButton>
                      </Tooltip>
                  </Box>
              )}

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
              bgcolor: 'background.level1',
              cursor: 'pointer',
              '&:hover': { bgcolor: 'background.level2', borderColor: 'primary.outlinedBorder' }
          }} onClick={() => setIsModalOpen(true)}>
            <IconButton variant="soft" color="neutral" size="lg" sx={{ borderRadius: '50%', mb: 2 }}>
                <Add />
            </IconButton>
            <Typography level="title-md">New Household</Typography>
            <Typography level="body-xs" textAlign="center" sx={{ px: 2 }}>Register a new property tenant</Typography>
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
                    placeholder="e.g. Summer House" 
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