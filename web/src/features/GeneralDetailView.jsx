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
  const { api, id: householdId, user: currentUser } = useOutletContext();
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
      console.error(`Failed to fetch ${endpoint}`, err);
    } finally {
      setLoading(false);
    }
  }, [api, householdId, endpoint]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    const updates = Object.fromEntries(formData.entries());

    try {
      await api.put(`/households/${householdId}/${endpoint}`, updates);
      // Optional: show notification via context if available
    } catch (err) {
      alert("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
        <Box sx={{ 
            width: 48, height: 48, borderRadius: 2, 
            bgcolor: 'primary.main', color: 'primary.contrastText',
            display: 'flex', alignItems: 'center', justifyContent: 'center' 
        }}>
            {icon}
        </Box>
        <Typography variant="h4" fontWeight="300">{title}</Typography>
      </Box>

      <Paper variant="outlined" sx={{ p: 4, borderRadius: 3 }}>
        <form onSubmit={handleSave}>
          <Grid container spacing={3}>
            {fields.map(f => (
              <Grid item xs={12} md={f.half ? 6 : 12} key={f.name}>
                <TextField
                  name={f.name}
                  label={f.label}
                  type={f.type || 'text'}
                  defaultValue={data[f.name] || ''}
                  fullWidth
                  multiline={f.multiline}
                  rows={f.rows}
                  disabled={!isHouseholdAdmin}
                  InputLabelProps={f.type === 'date' ? { shrink: true } : undefined}
                />
              </Grid>
            ))}
          </Grid>

          {isHouseholdAdmin && (
            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
              <Button 
                type="submit" 
                variant="contained" 
                size="large" 
                startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />}
                disabled={saving}
              >
                Save Changes
              </Button>
            </Box>
          )}
        </form>
      </Paper>
    </Box>
  );
}
