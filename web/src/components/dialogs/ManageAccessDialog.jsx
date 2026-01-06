import { Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, Button, FormControl, Select, MenuItem, InputLabel } from '@mui/material';

export default function ManageAccessDialog({ open, onClose, user, userHouseholds, adminHouseholds, onToggleAccess }) {
  if (!user) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 'bold' }}>Manage Access: {user.username}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Assign roles for each household. Selecting "None" will revoke access.
        </Typography>

        {adminHouseholds.map(h => {
          // Find if the user already has a role in this household
          const currentAccess = userHouseholds.find(uh => uh.household_id === h.id);
          const currentRole = currentAccess ? currentAccess.role : 'none';

          return (
            <Box key={h.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 2, borderBottom: '1px solid #eee' }}>
              <Typography sx={{ fontWeight: 500 }}>{h.name}</Typography>
              
              <FormControl size="small" sx={{ width: 130 }}>
                <Select
                  value={currentRole}
                  onChange={(e) => onToggleAccess(h.id, e.target.value)}
                >
                  <MenuItem value="none"><em>None</em></MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                  <MenuItem value="member">Member</MenuItem>
                  <MenuItem value="viewer">Viewer</MenuItem>
                </Select>
              </FormControl>
            </Box>
          );
        })}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="contained" fullWidth>Done</Button>
      </DialogActions>
    </Dialog>
  );
}