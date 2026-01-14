import { useState, useEffect } from 'react';
import { 
  Box, Typography, Sheet, Stack, Avatar, Button, Input, 
  FormControl, FormLabel, Grid, Divider, IconButton, Tooltip 
} from '@mui/joy';
import { useOutletContext } from 'react-router-dom';
import { Edit, Save, PhotoCamera } from '@mui/icons-material';
import { getEmojiColor } from '../theme';
import EmojiPicker from '../components/EmojiPicker';

export default function ProfileView() {
  const { user, onUpdateProfile, isDark, showNotification } = useOutletContext();
  const [isEditing, setIsEditing] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    username: '',
    avatar: '👤'
  });

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        username: user.username || '',
        avatar: user.avatar || '👤'
      });
    }
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await onUpdateProfile(formData);
      setIsEditing(false);
      showNotification("Profile updated successfully", "success");
    } catch (err) {
      showNotification("Failed to update profile", "danger");
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>Your Profile</Typography>
        <Typography level="body-md" color="neutral">Manage your personal information and application preferences.</Typography>
      </Box>

      <Sheet variant="outlined" sx={{ p: { xs: 2, md: 4 }, borderRadius: 'md' }}>
        <form onSubmit={handleSave}>
          <Grid container spacing={4}>
            <Grid xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Box sx={{ position: 'relative' }}>
                <Avatar 
                  size="lg" 
                  sx={{ 
                    '--Avatar-size': '120px', 
                    fontSize: '3rem', 
                    bgcolor: getEmojiColor(formData.avatar, isDark),
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                    '&:hover': { transform: 'scale(1.05)' }
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
              <Typography level="title-md" sx={{ mt: 2 }}>{formData.first_name} {formData.last_name}</Typography>
              <Typography level="body-xs" color="neutral">{formData.username || 'No username set'}</Typography>
            </Grid>

            <Grid xs={12} md={8}>
              <Stack spacing={3}>
                <Grid container spacing={2}>
                  <Grid xs={12} sm={6}>
                    <FormControl>
                      <FormLabel>First Name</FormLabel>
                      <Input 
                        disabled={!isEditing}
                        value={formData.first_name}
                        onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                      />
                    </FormControl>
                  </Grid>
                  <Grid xs={12} sm={6}>
                    <FormControl>
                      <FormLabel>Last Name</FormLabel>
                      <Input 
                        disabled={!isEditing}
                        value={formData.last_name}
                        onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                      />
                    </FormControl>
                  </Grid>
                </Grid>

                <FormControl>
                  <FormLabel>Email Address</FormLabel>
                  <Input 
                    disabled={true} 
                    value={formData.email}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Username</FormLabel>
                  <Input 
                    disabled={!isEditing}
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                  />
                </FormControl>

                <Divider sx={{ my: 1 }} />

                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  {!isEditing ? (
                    <Button 
                      variant="outlined" 
                      color="neutral" 
                      onClick={() => setIsEditing(true)}
                    >
                      Edit Profile
                    </Button>
                  ) : (
                    <>
                      <Button variant="plain" color="neutral" onClick={() => setIsEditing(false)}>Cancel</Button>
                      <Button type="submit">Save Changes</Button>
                    </>
                  )}
                </Box>
              </Stack>
            </Grid>
          </Grid>
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
        isDark={isDark}
      />
    </Box>
  );
}