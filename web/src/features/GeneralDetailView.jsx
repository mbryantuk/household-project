import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Paper, Grid, TextField, Button, CircularProgress, 
  Divider, Stack, useTheme 
} from '@mui/material';
import { Save } from '@mui/icons-material';

/**
 * A generic view for tables that only have one row (id=1)
 * e.g., House Details, Water Info, Council, Waste
 */
export default function GeneralDetailView({ title, icon, endpoint, fields }) {
  const { api, id: householdId, user: currentUser, showNotification } = useOutletContext();
  const theme = useTheme();
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isHouseholdAdmin = currentUser?.role === 'admin' || currentUser?.role === 'sysadmin';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/households/${householdId}/${endpoint}`);
      setData(res.data || {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [api, householdId, endpoint]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    const updates = Object.fromEntries(formData.entries());

    try {
      await api.put(`/households/${householdId}/${endpoint}`, updates);
      showNotification(`${title} updated successfully.`, "success");
      fetchData();
    } catch (err) {
      showNotification(`Failed to save ${title}.`, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
        <Box sx={{ 
          bgcolor: theme.palette.primary.main, 
          color: 'white', 
          p: 1, 
          borderRadius: 2, 
          display: 'flex',
          boxShadow: theme.shadows[2]
        }}>
          {icon}
        </Box>
        <Typography variant="h4" fontWeight="300">{title}</Typography>
      </Box>

      <Paper variant="outlined" sx={{ p: 4, borderRadius: 3 }}>
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
    </Box>
  );
}