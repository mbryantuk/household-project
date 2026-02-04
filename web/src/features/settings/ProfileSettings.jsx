import { useState, useEffect } from 'react';
import { Box, Typography, FormControl, FormLabel, Input, Button, Stack, Avatar, IconButton, Tooltip } from '@mui/joy';
import Edit from '@mui/icons-material/Edit';
import { useHousehold } from '../../contexts/HouseholdContext';
import { getEmojiColor } from '../../theme';
import EmojiPicker from '../../components/EmojiPicker';

export default function ProfileSettings() {
  const { user, onUpdateProfile, showNotification, isDark } = useHousehold();
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatar, setAvatar] = useState(user?.avatar || '👤');
  const [saving, setSaving] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdateProfile({ first_name: firstName, last_name: lastName, email, avatar });
      showNotification('Profile updated successfully!', 'success');
    } catch (err) {
      showNotification('Failed to update profile', 'danger');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={3} sx={{ maxWidth: 600 }}>
      <Box>
        <Typography level="h4">Public Profile</Typography>
        <Typography level="body-sm">Manage your personal information</Typography>
      </Box>

      <Stack direction="row" spacing={2} alignItems="center">
        <Tooltip title="Change Avatar" variant="soft">
            <Avatar 
                size="xl" 
                sx={{ 
                    '--Avatar-size': '80px', 
                    fontSize: '2.5rem', 
                    bgcolor: getEmojiColor(avatar, isDark),
                    cursor: 'pointer',
                    '&:hover': { transform: 'scale(1.05)' },
                    transition: 'transform 0.2s'
                }}
                onClick={() => setEmojiPickerOpen(true)}
            >
                {avatar}
            </Avatar>
        </Tooltip>
        <Button variant="outlined" size="sm" startDecorator={<Edit />} onClick={() => setEmojiPickerOpen(true)}>Change Emoji</Button>
      </Stack>

      <Stack direction="row" spacing={2}>
          <FormControl sx={{ flex: 1 }}>
            <FormLabel>First Name</FormLabel>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </FormControl>
          <FormControl sx={{ flex: 1 }}>
            <FormLabel>Last Name</FormLabel>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </FormControl>
      </Stack>

      <FormControl>
        <FormLabel>Email Address</FormLabel>
        <Input value={email} onChange={(e) => setEmail(e.target.value)} disabled />
      </FormControl>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 2 }}>
        <Button loading={saving} onClick={handleSave} size="lg">Save Changes</Button>
      </Box>

      <EmojiPicker 
        open={emojiPickerOpen} 
        onClose={() => setEmojiPickerOpen(false)} 
        onEmojiSelect={(emoji) => {
          setAvatar(emoji);
          setEmojiPickerOpen(false);
        }}
        title="Choose Avatar Emoji"
      />
    </Stack>
  );
}
