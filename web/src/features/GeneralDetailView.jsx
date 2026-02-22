import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Box,
  Typography,
  Sheet,
  Divider,
  Grid,
  Input,
  Button,
  CircularProgress,
  FormControl,
  FormLabel,
  Textarea,
  Checkbox,
} from '@mui/joy';
import { Save } from '@mui/icons-material';
import EmojiPicker from '../components/EmojiPicker';

/**
 * A generic view for tables that only have one row (id=1)
 * e.g., House Details, Water Info, Council, Waste
 */
export default function GeneralDetailView({ title, endpoint, fields, computed = [] }) {
  const { api, id: householdId, user: currentUser, showNotification } = useOutletContext();
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
      showNotification(`${title} updated successfully.`, 'success');
      // Fetch fresh data after save
      const res = await api.get(`/households/${householdId}/${endpoint}`);
      setData(res.data || {});
      setSelectedEmoji(res.data?.icon || null);
    } catch {
      showNotification(`Failed to save ${title}.`, 'danger');
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );

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

      {computed.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {computed.map((item, idx) => {
            const val = item.calculate ? item.calculate(data) : 0;
            return (
              <Grid xs={12} sm={6} md={4} key={idx}>
                <Sheet
                  variant="soft"
                  color={item.color || 'primary'}
                  sx={{ p: 2, borderRadius: 'md' }}
                >
                  <Typography
                    level="body-sm"
                    sx={{ fontWeight: 'bold', textTransform: 'uppercase', opacity: 0.8 }}
                  >
                    {item.label}
                  </Typography>
                  <Typography level="h3">
                    {item.format === 'currency'
                      ? new Intl.NumberFormat('en-GB', {
                          style: 'currency',
                          currency: 'GBP',
                        }).format(val)
                      : val}
                  </Typography>
                </Sheet>
              </Grid>
            );
          })}
        </Grid>
      )}

      <Sheet variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 'md' }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {fields.map((field) => (
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
                  startDecorator={
                    saving ? <CircularProgress size="sm" color="neutral" /> : <Save />
                  }
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
