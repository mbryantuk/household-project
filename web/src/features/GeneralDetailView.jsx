import { useState, useEffect, useCallback, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Paper, Grid, TextField, Button, CircularProgress, 
  Divider, Stack, useTheme, Tooltip, IconButton
} from '@mui/material';
import { Save } from '@mui/icons-material';
import EmojiPicker from '../components/EmojiPicker';
import { getEmojiColor } from '../theme';

/**
 * A generic view for tables that only have one row (id=1)
 * e.g., House Details, Water Info, Council, Waste
 */
export default function GeneralDetailView({ title, icon: defaultIcon, endpoint, fields }) {
  const { api, id: householdId, user: currentUser, showNotification, isDark } = useOutletContext();
  const theme = useTheme();
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState(null);

  const isHouseholdAdmin = currentUser?.role === 'admin' || currentUser?.role === 'sysadmin';

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get(`/households/${householdId}/${endpoint}`);
      setData(res.data || {});
      setSelectedEmoji(res.data?.icon || null);
    } catch (err) {
      console.error(`Error fetching ${endpoint}:`, err);
    } finally {
      setLoading(false);
    }
  }, [api, householdId, endpoint]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    const updates = Object.fromEntries(formData.entries());
    updates.icon = selectedEmoji;

    try {
      await api.put(`/households/${householdId}/${endpoint}`, updates);
      showNotification(`${title} updated successfully.`, "success");
      // Fetch fresh data after save
      const res = await api.get(`/households/${householdId}/${endpoint}`);
      setData(res.data || {});
      setSelectedEmoji(res.data?.icon || null);
    } catch (err) {
      showNotification(`Failed to save ${title}.`, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>;

  const displayIcon = selectedEmoji ? (
    <Typography sx={{ fontSize: '1.5rem' }}>{selectedEmoji}</Typography>
  ) : defaultIcon;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
        <Tooltip title={isHouseholdAdmin ? "Change Icon" : ""}>
          <IconButton 
            onClick={() => isHouseholdAdmin && setEmojiPickerOpen(true)}
            sx={{ 
              bgcolor: selectedEmoji ? getEmojiColor(selectedEmoji, isDark) : theme.palette.primary.main, 
              color: 'white', 
              p: 1, 
              borderRadius: 2, 
              display: 'flex',
              boxShadow: theme.shadows[2],
              '&:hover': {
                bgcolor: selectedEmoji ? getEmojiColor(selectedEmoji, isDark) : theme.palette.primary.dark,
                opacity: 0.9
              }
            }}
          >
            {displayIcon}
          </IconButton>
        </Tooltip>
        <Typography variant="h4" fontWeight="300">{title}</Typography>
      </Box>

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3, md: 4 }, borderRadius: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {fields.map(field => (
              <Grid item xs={12} md={field.half ? 6 : 12} key={field.name}>
                <TextField
                  name={field.name}
                  label={field.label}
                  type={field.type || 'text'}
                  defaultValue={data[field.name] || ''}
                  fullWidth
                  multiline={field.multiline}
                  rows={field.rows}
                  disabled={!isHouseholdAdmin || saving}
                  InputLabelProps={field.type === 'date' ? { shrink: true } : undefined}
                />
              </Grid>
            ))}
            
            {isHouseholdAdmin && (
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Button 
                  type="submit" 
                  variant="contained" 
                  size="large" 
                  startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </Grid>
            )}
          </Grid>
        </form>
      </Paper>

      <EmojiPicker 
        open={emojiPickerOpen} 
        onClose={() => setEmojiPickerOpen(false)} 
        onEmojiSelect={(emoji) => {
          setSelectedEmoji(emoji);
          setEmojiPickerOpen(false);
        }}
        title={`Select ${title} Icon`}
      />
    </Box>
  );
}
