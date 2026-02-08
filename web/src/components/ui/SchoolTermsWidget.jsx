import { useState, useEffect, useCallback } from 'react';
import { 
  Box, Typography, Button, Sheet, Table, IconButton, 
  FormControl, FormLabel, Input, Stack, Modal, ModalDialog, Divider,
  DialogTitle, DialogContent, DialogActions
} from '@mui/joy';
import { Add, Delete, Edit, School } from '@mui/icons-material';

export default function SchoolTermsWidget({ api, householdId, memberId, showNotification, confirmAction }) {
  const [terms, setTerms] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchTerms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/households/${householdId}/school-terms?member_id=${memberId}`);
      setTerms(res.data || []);
    } catch (err) {
      console.error(err);
      if (showNotification) showNotification("Failed to load school terms", "danger");
    } finally {
      setLoading(false);
    }
  }, [api, householdId, memberId, showNotification]);

  useEffect(() => {
    fetchTerms();
  }, [fetchTerms]);

  const handleOpen = (term = null) => {
    setEditingTerm(term);
    setOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    data.member_id = memberId;

    try {
      if (editingTerm) {
        await api.put(`/households/${householdId}/school-terms/${editingTerm.id}`, data);
        if (showNotification) showNotification("School term updated", "success");
      } else {
        await api.post(`/households/${householdId}/school-terms`, data);
        if (showNotification) showNotification("School term added", "success");
      }
      setOpen(false);
      fetchTerms();
    } catch (err) {
      console.error(err);
      if (showNotification) showNotification("Failed to save school term", "danger");
    }
  };

  const handleDelete = (id) => {
    confirmAction(
      "Remove School Term",
      "Are you sure you want to remove this school term? It will also be removed from the calendar.",
      async () => {
        try {
          await api.delete(`/households/${householdId}/school-terms/${id}`);
          if (showNotification) showNotification("School term removed", "neutral");
          fetchTerms();
        } catch (err) {
          console.error(err);
          if (showNotification) showNotification("Failed to delete", "danger");
        }
      }
    );
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
            <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>
                <School sx={{ mr: 1, verticalAlign: 'middle' }} /> School Terms
            </Typography>
            <Typography level="body-md" color="neutral">Record term dates to highlight them on the family calendar.</Typography>
        </Box>
        <Button startDecorator={<Add />} onClick={() => handleOpen()}>Add Term</Button>
      </Box>

      <Sheet variant="outlined" sx={{ borderRadius: 'md', overflow: 'auto' }}>
        <Table aria-label="school terms table" sx={{ '& tr > *:last-child': { textAlign: 'right' } }}>
          <thead>
            <tr>
              <th>Term Name</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th style={{ width: 100 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {terms.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>
                  <Typography color="neutral">No school terms recorded yet.</Typography>
                </td>
              </tr>
            ) : (
              terms.map((term) => (
                <tr key={term.id}>
                  <td>{term.term_name}</td>
                  <td>{term.start_date}</td>
                  <td>{term.end_date}</td>
                  <td>
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <IconButton size="sm" variant="soft" color="primary" onClick={() => handleOpen(term)}>
                        <Edit />
                      </IconButton>
                      <IconButton size="sm" variant="soft" color="danger" onClick={() => handleDelete(term.id)}>
                        <Delete />
                      </IconButton>
                    </Stack>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Sheet>

      <Modal open={open} onClose={() => setOpen(false)}>
        <ModalDialog sx={{ maxWidth: 400, width: '100%' }}>
          <DialogTitle>{editingTerm ? 'Edit School Term' : 'Add School Term'}</DialogTitle>
          <Divider />
          <form onSubmit={handleSubmit}>
            <DialogContent>
              <Stack spacing={2}>
                <FormControl required>
                  <FormLabel>Term Name</FormLabel>
                  <Input name="term_name" defaultValue={editingTerm?.term_name || ''} placeholder="e.g. Autumn Term 2026" autoFocus />
                </FormControl>
                <FormControl required>
                  <FormLabel>Start Date</FormLabel>
                  <Input name="start_date" type="date" defaultValue={editingTerm?.start_date || ''} />
                </FormControl>
                <FormControl required>
                  <FormLabel>End Date</FormLabel>
                  <Input name="end_date" type="date" defaultValue={editingTerm?.end_date || ''} />
                </FormControl>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button type="submit" variant="solid">Save Term</Button>
              <Button variant="plain" color="neutral" onClick={() => setOpen(false)}>Cancel</Button>
            </DialogActions>
          </form>
        </ModalDialog>
      </Modal>
    </Box>
  );
}
