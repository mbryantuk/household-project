import { useState, useEffect, useCallback } from 'react';
import { 
  Box, Typography, IconButton, Button, Modal, ModalDialog, DialogTitle, 
  DialogContent, DialogActions, Input, FormControl, FormLabel, 
  Select, Option, Stack, Table, Sheet, Chip, CircularProgress, Switch, Textarea
} from '@mui/joy';
import { Add, Edit, Delete, ReceiptLong } from '@mui/icons-material';

export default function RecurringCostsWidget({ api, householdId, parentType, parentId, showNotification, isAdmin }) {
  const [costs, setCosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState(null);
  const [isNearestWorkingDay, setIsNearestWorkingDay] = useState(false);

  const fetchCosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/households/${householdId}/costs`);
      // Filter for this specific parent
      const filtered = (res.data || []).filter(c => c.parent_type === parentType && c.parent_id === parseInt(parentId));
      setCosts(filtered);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [api, householdId, parentType, parentId]);

  useEffect(() => {
    fetchCosts();
  }, [fetchCosts]);

  useEffect(() => {
    if (editItem) {
      setIsNearestWorkingDay(Boolean(editItem.nearest_working_day));
    }
  }, [editItem]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    data.parent_type = parentType;
    data.parent_id = parentId;
    data.nearest_working_day = isNearestWorkingDay ? 1 : 0;

    try {
      if (editItem.id) {
        await api.put(`/households/${householdId}/costs/${editItem.id}`, data);
        showNotification("Cost updated.", "success");
      } else {
        await api.post(`/households/${householdId}/costs`, data);
        showNotification("Cost added.", "success");
      }
      fetchCosts();
      setEditItem(null);
    } catch (err) {
      showNotification("Failed to save cost.", "danger");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this recurring cost?")) return;
    try {
      await api.delete(`/households/${householdId}/costs/${id}`);
      showNotification("Cost deleted.", "neutral");
      fetchCosts();
    } catch (err) {
      showNotification("Failed to delete.", "danger");
    }
  };

  if (loading && costs.length === 0) return <CircularProgress size="sm" />;

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography level="title-md" startDecorator={<ReceiptLong color="primary" />}>
            Misc / Recurring Costs
        </Typography>
        {isAdmin && (
            <Button size="sm" variant="outlined" startDecorator={<Add />} onClick={() => setEditItem({})}>Add Cost</Button>
        )}
      </Box>

      {costs.length === 0 ? (
        <Typography level="body-sm" color="neutral" sx={{ fontStyle: 'italic' }}>No misc costs recorded.</Typography>
      ) : (
        <Sheet variant="outlined" sx={{ borderRadius: 'sm', overflow: 'auto' }}>
            <Table hoverRow size="sm">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Amount</th>
                        <th>Frequency</th>
                        {isAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
                    </tr>
                </thead>
                <tbody>
                    {costs.map((row) => (
                        <tr key={row.id}>
                            <td>{row.name}</td>
                            <td>£{row.amount}</td>
                            <td>
                                <Chip size="sm" variant="outlined">{row.frequency}</Chip>
                                {row.payment_day && <Typography level="body-xs" display="block">Day: {row.payment_day} {row.nearest_working_day ? '(NWD)' : ''}</Typography>}
                            </td>
                            {isAdmin && (
                                <td style={{ textAlign: 'right' }}>
                                    <IconButton size="sm" variant="plain" onClick={() => setEditItem(row)}><Edit fontSize="inherit" /></IconButton>
                                    <IconButton size="sm" variant="plain" color="danger" onClick={() => handleDelete(row.id)}><Delete fontSize="inherit" /></IconButton>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </Table>
        </Sheet>
      )}

      <Modal open={Boolean(editItem)} onClose={() => setEditItem(null)}>
        <ModalDialog sx={{ maxWidth: 400, width: '100%' }}>
            <DialogTitle>{editItem?.id ? 'Edit Cost' : 'Add Recurring Cost'}</DialogTitle>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <FormControl required>
                            <FormLabel>Cost Name</FormLabel>
                            <Input name="name" defaultValue={editItem?.name} />
                        </FormControl>
                        <FormControl required>
                            <FormLabel>Amount (£)</FormLabel>
                            <Input name="amount" type="number" defaultValue={editItem?.amount} />
                        </FormControl>
                        <FormControl>
                            <FormLabel>Frequency</FormLabel>
                            <Select name="frequency" defaultValue={editItem?.frequency || 'Monthly'}>
                                <Option value="Daily">Daily</Option>
                                <Option value="Weekly">Weekly</Option>
                                <Option value="Biweekly">Biweekly</Option>
                                <Option value="Monthly">Monthly</Option>
                                <Option value="Yearly">Yearly</Option>
                            </Select>
                        </FormControl>
                        <FormControl>
                            <FormLabel>Payment Day (1-31)</FormLabel>
                            <Input name="payment_day" type="number" defaultValue={editItem?.payment_day} />
                        </FormControl>
                        
                        <FormControl orientation="horizontal" sx={{ gap: 1 }}>
                            <Switch checked={isNearestWorkingDay} onChange={e => setIsNearestWorkingDay(e.target.checked)} />
                            <FormLabel>Nearest Working Day (Prior)</FormLabel>
                        </FormControl>

                        <FormControl>
                            <FormLabel>Notes</FormLabel>
                            <Textarea name="notes" defaultValue={editItem?.notes} minRows={2} />
                        </FormControl>

                        <DialogActions>
                            <Button variant="plain" color="neutral" onClick={() => setEditItem(null)}>Cancel</Button>
                            <Button type="submit" variant="solid">Save Cost</Button>
                        </DialogActions>
                    </Stack>
                </form>
            </DialogContent>
        </ModalDialog>
      </Modal>
    </Box>
  );
}
