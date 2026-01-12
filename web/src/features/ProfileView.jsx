import { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Sheet, Button, Input, FormControl, FormLabel, 
  Stack, Avatar, IconButton, Divider, Breadcrumbs, Link, Grid
} from '@mui/joy';
import { 
  Save, ArrowBack, Person, Email, Lock, Badge, ChevronRight
} from '@mui/icons-material';
import EmojiPicker from '../components/EmojiPicker';
import { getEmojiColor } from '../theme';

export default function ProfileView() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { api, user: currentUser, showNotification, fetchVehicles } = useOutletContext();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    avatar: '👤',
    role: 'member'
  });
  const [password, setPassword] = useState('');
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  const isMe = !userId || parseInt(userId) === currentUser.id;
  const targetId = userId || currentUser.id;

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        // If it's the current user, we can use the context user initially
        if (isMe) {
          setFormData({
            first_name: currentUser.first_name || '',
            last_name: currentUser.last_name || '',
            email: currentUser.email || '',
            avatar: currentUser.avatar || '👤',
            role: currentUser.role
          });
        }
        
        // Always fetch fresh data
        const res = await api.get(isMe ? '/auth/profile' : `/admin/users/${targetId}`);
        const u = res.data;
        setFormData({
          first_name: u.first_name || '',
          last_name: u.last_name || '',
          email: u.email || '',
          avatar: u.avatar || '👤',
          role: u.role || 'member'
        });
      } catch (err) {
        showNotification("Failed to load user profile.", "danger");
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [api, targetId, isMe, currentUser, showNotification]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const updates = { ...formData };
      if (password) updates.password = password;

      if (isMe) {
        await api.put('/auth/profile', updates);
        showNotification("Your profile has been updated.", "success");
        // We might need to refresh the global user state here, 
        // but App.jsx handles it if we trigger a refresh or it pulls from API next time.
      } else {
        await api.put(`/admin/users/${targetId}`, updates);
        showNotification("User updated successfully.", "success");
      }
      navigate(-1);
    } catch (err) {
      showNotification("Failed to update profile.", "danger");
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: { xs: 2, md: 4 } }}>
      <Breadcrumbs separator={<ChevronRight fontSize="small" />} sx={{ p: 0, mb: 3 }}>
        <Link color="neutral" onClick={() => navigate('../dashboard')} sx={{ cursor: 'pointer' }}>Home</Link>
        {!isMe && <Link color="neutral" onClick={() => navigate('../settings')} sx={{ cursor: 'pointer' }}>Settings</Link>}
        <Typography color="primary">{isMe ? 'My Profile' : 'Edit User'}</Typography>
      </Breadcrumbs>

      <Sheet variant="outlined" sx={{ p: 4, borderRadius: 'md', boxShadow: 'sm' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <IconButton onClick={() => navigate(-1)} variant="plain" color="neutral">
            <ArrowBack />
          </IconButton>
          <Typography level="h3">{isMe ? 'My Profile' : `Edit ${formData.first_name}`}</Typography>
        </Box>

        <form onSubmit={handleSubmit}>
          <Stack spacing={4}>
            {/* Avatar Selection */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <Box 
                sx={{ 
                  position: 'relative',
                  width: 120, height: 120, borderRadius: '50%', 
                  bgcolor: getEmojiColor(formData.avatar, false),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '4rem', cursor: 'pointer',
                  border: '4px solid', borderColor: 'background.surface',
                  boxShadow: 'md',
                  transition: 'transform 0.2s',
                  '&:hover': { transform: 'scale(1.05)' }
                }}
                onClick={() => setEmojiPickerOpen(true)}
              >
                {formData.avatar}
              </Box>
              <Typography level="body-sm">Click to change avatar</Typography>
            </Box>

            <Grid container spacing={2}>
              <Grid xs={12} md={6}>
                <FormControl>
                  <FormLabel>First Name</FormLabel>
                  <Input 
                    startDecorator={<Person />}
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  />
                </FormControl>
              </Grid>
              <Grid xs={12} md={6}>
                <FormControl>
                  <FormLabel>Last Name</FormLabel>
                  <Input 
                    startDecorator={<Person />}
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  />
                </FormControl>
              </Grid>
              <Grid xs={12}>
                <FormControl>
                  <FormLabel>Email</FormLabel>
                  <Input 
                    type="email"
                    startDecorator={<Email />}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </FormControl>
              </Grid>
              <Grid xs={12}>
                <FormControl>
                  <FormLabel>New Password</FormLabel>
                  <Input 
                    type="password"
                    placeholder="Leave blank to keep current"
                    startDecorator={<Lock />}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </FormControl>
              </Grid>
            </Grid>

            <Divider />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button variant="plain" color="neutral" onClick={() => navigate(-1)}>Cancel</Button>
              <Button type="submit" startDecorator={<Save />}>Save Changes</Button>
            </Box>
          </Stack>
        </form>
      </Sheet>

      <EmojiPicker 
        open={emojiPickerOpen} 
        onClose={() => setEmojiPickerOpen(false)} 
        onEmojiSelect={(emoji) => setFormData({ ...formData, avatar: emoji })}
        title="Choose Avatar"
      />
    </Box>
  );
}
