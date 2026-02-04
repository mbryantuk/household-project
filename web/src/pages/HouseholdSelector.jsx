import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Card, CardCover, AspectRatio, Button, Stack, Avatar, 
  IconButton, Tooltip, Modal, ModalDialog, DialogTitle, DialogContent, DialogActions, 
  FormControl, FormLabel, Input 
} from '@mui/joy';
import Add from '@mui/icons-material/Add';
import Logout from '@mui/icons-material/Logout';
import DeleteForever from '@mui/icons-material/DeleteForever';
import { getEmojiColor } from '../theme';

/**
 * Mantelpiece Household Selector
 * A curated choice screen where households are displayed as framed photos on a wooden shelf.
 */
export default function HouseholdSelector({ api, currentUser, onLogout, showNotification, onSelectHousehold }) {
  const navigate = useNavigate();
  const [households, setHouseholds] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  
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
    setSelectedId(hh.id);
    // Small delay for visual feedback (pop effect)
    setTimeout(async () => {
        if (onSelectHousehold) await onSelectHousehold(hh);
        navigate(`/household/${hh.id}/dashboard`);
    }, 400);
  };

  const handleDeleteHousehold = async (e, hh) => {
    e.stopPropagation();
    const confirmed = window.confirm(`⚠️ Are you sure you want to DELETE ${hh.name}? This action is permanent.`);
    if (confirmed) {
        try {
            await api.delete(`/households/${hh.id}`);
            showNotification(`Household "${hh.name}" deleted.`, "success");
            fetchHouseholds();
        } catch (err) {
            showNotification("Only administrators can delete households.", "danger");
        }
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
    } catch (err) {
        showNotification("Failed to create household.", "danger");
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Box sx={{ 
      height: '100dvh', 
      width: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      bgcolor: '#171a1c',
      background: 'radial-gradient(circle at 50% 30%, #3e4c5b 0%, #171a1c 100%)', // "The Wall"
      overflow: 'hidden',
      position: 'relative'
    }}>
      
      {/* Wall Text */}
      <Stack spacing={1} alignItems="center" sx={{ mb: 12, zIndex: 2, color: 'white', textShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
        <Typography level="h2" sx={{ color: 'inherit', fontWeight: 300, letterSpacing: '4px', textTransform: 'uppercase' }}>MANTEL</Typography>
        <Typography level="body-md" sx={{ color: 'neutral.300', opacity: 0.8 }}>Welcome home, {currentUser?.first_name || currentUser?.username}</Typography>
      </Stack>

      {/* The Shelf Layout */}
      <Stack 
        direction="row" 
        spacing={{ xs: 2, md: 4 }} 
        sx={{ 
            zIndex: 2, 
            perspective: '1000px', 
            alignItems: 'flex-end',
            mb: '-12px',
            px: 4,
            maxWidth: '100vw',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' }
        }}
      >
        {households.map((hh) => (
            <FramedHousehold 
                key={hh.id} 
                household={hh} 
                onClick={() => handleSelect(hh)} 
                onDelete={(e) => handleDeleteHousehold(e, hh)}
                isSelected={selectedId === hh.id}
            />
        ))}

        {/* "New Frame" Placeholder */}
        <Card variant="outlined" 
            onClick={() => setIsModalOpen(true)}
            sx={{ 
                width: { xs: 140, md: 180 },
                height: { xs: 175, md: 225 },
                flexShrink: 0,
                bgcolor: 'transparent', 
                borderColor: 'rgba(255,255,255,0.2)', 
                borderStyle: 'dashed',
                cursor: 'pointer',
                transform: 'rotateX(5deg)',
                transformOrigin: 'bottom center',
                transition: 'all 0.2s',
                '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.05)', transform: 'rotateX(2deg) scale(1.02)' }
            }}
        >
            <Stack alignItems="center" justifyContent="center" sx={{ height: '100%', color: 'neutral.400' }}>
                <Add sx={{ fontSize: '2.5rem', mb: 1 }} />
                <Typography level="body-xs" sx={{ color: 'inherit', textTransform: 'uppercase', letterSpacing: '1px' }}>Add New</Typography>
            </Stack>
        </Card>
      </Stack>

      {/* The Physical Shelf */}
      <Box sx={{ 
          width: '100%', 
          height: '35vh', 
          bgcolor: '#2d241e', // Dark Wood
          borderTop: '12px solid #3e3229', // Shelf Edge
          boxShadow: '0 -20px 80px rgba(0,0,0,0.8)',
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          justifyContent: 'center'
      }}>
         <Box sx={{ 
             position: 'absolute', top: 0, left: 0, right: 0, height: '100%', 
             background: 'linear-gradient(to bottom, rgba(0,0,0,0.2), transparent)' 
         }} />
         
         {/* Logout quietly sitting on the shelf edge */}
         <Button 
            variant="plain" 
            color="neutral" 
            startDecorator={<Logout />} 
            onClick={onLogout}
            sx={{ 
                position: 'absolute', bottom: 32, right: 32, 
                color: 'rgba(255,255,255,0.3)',
                '&:hover': { color: 'white', bgcolor: 'rgba(255,255,255,0.05)' }
            }}
         >
            Log Out
         </Button>
      </Box>

      {/* Create Modal */}
      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <ModalDialog>
          <DialogTitle>Add to Mantel</DialogTitle>
          <DialogContent>Register a new household structure.</DialogContent>
          <form onSubmit={handleCreateHousehold}>
            <Stack spacing={2}>
              <FormControl required>
                <FormLabel>Household Name</FormLabel>
                <Input 
                    autoFocus 
                    placeholder="e.g. London Flat" 
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

    </Box>
  );
}

function FramedHousehold({ household, onClick, onDelete, isSelected }) {
    const bgColor = getEmojiColor(household.avatar || '🏠');
    
    return (
        <Card
            onClick={onClick}
            variant="solid"
            sx={{
                width: { xs: 140, md: 180 },
                flexShrink: 0,
                aspectRatio: '4/5',
                p: 1.5, // The white matting
                bgcolor: 'white',
                cursor: 'pointer',
                transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                transform: isSelected 
                    ? 'scale(1.15) translateY(-40px) rotateX(0deg)' 
                    : 'rotateX(5deg)',
                transformOrigin: 'bottom center',
                boxShadow: isSelected 
                    ? '0 30px 60px rgba(0,0,0,0.6)' 
                    : '0 15px 30px rgba(0,0,0,0.4)',
                '&:hover': {
                    transform: isSelected ? 'scale(1.15) translateY(-40px)' : 'scale(1.05) translateY(-10px) rotateX(2deg)',
                    boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
                    '& .delete-btn': { opacity: 1 }
                },
                position: 'relative'
            }}
        >
            {household.role === 'admin' && !isSelected && (
                <IconButton 
                    className="delete-btn"
                    size="sm" variant="soft" color="danger"
                    onClick={onDelete}
                    sx={{ 
                        position: 'absolute', top: 8, right: 8, zIndex: 10,
                        opacity: 0, transition: 'opacity 0.2s',
                        borderRadius: '50%'
                    }}
                >
                    <DeleteForever />
                </IconButton>
            )}

            <Box sx={{ 
                bgcolor: bgColor, 
                flex: 1, 
                borderRadius: 'sm', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                border: '1px solid',
                borderColor: 'rgba(0,0,0,0.05)',
                overflow: 'hidden'
            }}>
                <Typography sx={{ fontSize: { xs: '2.5rem', md: '3.5rem' }, mb: 1 }}>
                    {household.avatar || '🏠'}
                </Typography>
                <Typography 
                    level="title-sm" 
                    sx={{ 
                        color: 'neutral.800', 
                        fontWeight: 'bold',
                        textAlign: 'center',
                        px: 1,
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}
                >
                    {household.name}
                </Typography>
                <Typography level="body-xs" sx={{ color: 'neutral.500', textTransform: 'uppercase', fontSize: '9px', mt: 0.5, letterSpacing: '1px' }}>
                    {household.role}
                </Typography>
            </Box>
        </Card>
    );
}
