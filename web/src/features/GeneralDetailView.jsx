import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Sheet, Grid, Input, Button, CircularProgress, 
  Divider, Tooltip, IconButton, FormControl, FormLabel, Textarea, Checkbox
} from '@mui/joy';
import { Save } from '@mui/icons-material';
import EmojiPicker from '../components/EmojiPicker';
import { getEmojiColor } from '../theme';

/**
 * A generic view for tables that only have one row (id=1)
 * e.g., House Details, Water Info, Council, Waste
 */
export default function GeneralDetailView({ title, icon: defaultIcon, endpoint, fields }) {
  const { api, id: householdId, user: currentUser, showNotification, isDark } = useOutletContext();
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState(null);

  const isAdmin = currentUser?.role === 'admin';

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
      showNotification(`Failed to save ${title}.`, "danger");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>
          {title}
        </Typography>
        <Typography level="body-md" color="neutral">
          View and manage the structural and specific details for this section.
        </Typography>
      </Box>

      <Sheet variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 'md' }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {fields.map(field => (
              <Grid xs={12} md={field.half ? 6 : 12} key={field.name}>
                {field.type === 'checkbox' ? (
                    <Checkbox 
                        label={field.label} 
                        name={field.name}
                        defaultChecked={data[field.name] !== 0}
                        value="1"
                        disabled={!isAdmin || saving}
                        sx={{ mt: 3 }}
                    />
                ) : (
                <FormControl>
                    <FormLabel>{field.label}</FormLabel>
                    {field.multiline ? (
                        <Textarea 
                            name={field.name} 
                            defaultValue={data[field.name] || ''} 
                            minRows={field.rows} 
                            disabled={!isAdmin || saving}
                        />
                    ) : (
                        <Input
                            name={field.name}
                            type={field.type || 'text'}
                            step={field.step}
                            defaultValue={data[field.name] || ''}
                            disabled={!isAdmin || saving}
                        />
                    )}
                </FormControl>
                )}
              </Grid>
            ))}
            
            {isAdmin && (
              <Grid xs={12}>
                <Divider sx={{ my: 2 }} />
                <Button 
                  type="submit" 
                  variant="solid" 
                  size="lg" 
                  startDecorator={saving ? <CircularProgress size="sm" color="neutral" /> : <Save />}
                  loading={saving}
                >
                  Save Changes
                </Button>
              </Grid>
            )}
          </Grid>
        </form>
      </Sheet>

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