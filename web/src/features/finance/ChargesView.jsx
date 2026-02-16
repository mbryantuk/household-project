import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Grid, Button, Modal, ModalDialog, DialogTitle, DialogContent, Input,
  FormControl, FormLabel, Stack, Chip, CircularProgress,
  Sheet, Checkbox, IconButton, Table
} from '@mui/joy';
import { Add, Edit, Delete } from '@mui/icons-material';
import AppSelect from '../../components/ui/AppSelect';
import ModuleHeader from '../../components/ui/ModuleHeader';

const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return num.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' });
};

export default function ChargesView({ financialProfileId }) {
  const { api, id: householdId, isDark, showNotification, confirmAction } = useOutletContext();
  const [charges, setCharges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [objects, setObjects] = useState([]); // List of available entities to link to

  const fetchData = useCallback(async () => {
    if (!financialProfileId) return;
    setLoading(true);
    try {
      const [res, objRes] = await Promise.all([
          api.get(`/households/${householdId}/finance/recurring-costs?financial_profile_id=${financialProfileId}`),
          api.get(`/households/${householdId}/assets`) // Simplified for now, could be assets, members etc.
      ]);
      setCharges(res.data || []);
      setObjects(objRes.data || []);
    } catch (err) { console.error("Failed to fetch charges", err); } finally { setLoading(false); }
  }, [api, householdId, financialProfileId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    data.financial_profile_id = financialProfileId;
    data.adjust_for_working_day = data.adjust_for_working_day ? 1 : 0;

    try {
      const url = editingId 
        ? `/households/${householdId}/finance/recurring-costs/${editingId}`
        : `/households/${householdId}/finance/recurring-costs`;
      
      const method = editingId ? 'put' : 'post';
      await api[method](url, data);
      
      showNotification(editingId ? "Charge updated." : "Charge created.", "success");
      setOpen(false);
      setEditingId(null);
      fetchData();
    } catch (err) {
      showNotification("Failed to save: " + err.message, "danger");
    }
  };

  const handleEdit = (charge) => {
    setEditingId(charge.id);
    setOpen(true);
  };

  const handleDelete = (id) => {
    confirmAction("Delete Charge?", "This will remove the recurring cost from your budget.", async () => {
        try {
            await api.delete(`/households/${householdId}/finance/recurring-costs/${id}`);
            showNotification("Charge deleted.", "neutral");
            fetchData();
        } catch { alert("Failed to delete"); }
    });
  };

  const resolveEntityName = (type, id) => {
      if (!id) return 'Household';
      const obj = objects.find(o => o.id === id);
      return obj ? `${obj.emoji} ${obj.name}` : `${type} #${id}`;
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  return (
    <Box>
        <ModuleHeader 
            title="Recurring Charges"
            description="Manage bills, insurance, and subscriptions."
            emoji="🧾"
            isDark={isDark}
            action={
                <Button variant="solid" startDecorator={<Add />} onClick={() => { setEditingId(null); setOpen(true); }} sx={{ height: '44px' }}>
                    Add Charge
                </Button>
            }
        />

        <Sheet variant="outlined" sx={{ borderRadius: 'md', overflow: 'auto' }}>
            <Table aria-label="recurring charges table" sx={{ '& tr > *:last-child': { textAlign: 'right' } }}>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Amount</th>
                        <th>Link</th>
                        <th>Frequency</th>
                        <th>Day</th>
                        <th style={{ width: 100 }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {charges.map(charge => (
                        <tr key={charge.id}>
                            <td>
                                <Typography level="title-sm">{charge.name}</Typography>
                                <Typography level="body-xs">{charge.category}</Typography>
                            </td>
                            <td><Typography fontWeight="bold" color="danger">{formatCurrency(charge.amount)}</Typography></td>
                            <td><Chip size="sm" variant="soft">{resolveEntityName(charge.object_type, charge.object_id)}</Chip></td>
                            <td><Chip size="sm" variant="plain" color="neutral" sx={{ textTransform: 'capitalize' }}>{charge.frequency}</Chip></td>
                            <td>
                                {charge.payment_day}
                                {charge.adjust_for_working_day && <Chip size="sm" variant="plain" color="primary" sx={{ ml: 1, fontSize: '0.7em' }}>NWD</Chip>}
                            </td>
                            <td>
                                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                    <IconButton size="sm" variant="plain" onClick={() => handleEdit(charge)}><Edit /></IconButton>
                                    <IconButton size="sm" variant="plain" color="danger" onClick={() => handleDelete(charge.id)}><Delete /></IconButton>
                                </Box>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        </Sheet>

        <Modal open={open} onClose={() => setOpen(false)}>
            <ModalDialog sx={{ maxWidth: 500, width: '100%' }}>
                <DialogTitle>{editingId ? 'Edit Charge' : 'New Charge'}</DialogTitle>
                <DialogContent>
                    <form onSubmit={handleSave}>
                        <Stack spacing={2}>
                            <FormControl required><FormLabel>Name</FormLabel><Input name="name" defaultValue={charges.find(c => c.id === editingId)?.name} /></FormControl>
                            <Grid container spacing={2}>
                                <Grid xs={6}>
                                    <FormControl required><FormLabel>Amount (£)</FormLabel><Input name="amount" type="number" step="0.01" defaultValue={charges.find(c => c.id === editingId)?.amount} /></FormControl>
                                </Grid>
                                <Grid xs={6}>
                                    <AppSelect label="Category" name="category" defaultValue={charges.find(c => c.id === editingId)?.category || 'Bill'} options={[{ value: 'bill', label: 'Bill' }, { value: 'insurance', label: 'Insurance' }, { value: 'subscription', label: 'Subscription' }, { value: 'tax', label: 'Tax' }]} />
                                </Grid>
                                <Grid xs={6}>
                                    <AppSelect label="Frequency" name="frequency" defaultValue={charges.find(c => c.id === editingId)?.frequency || 'monthly'} options={[{ value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }, { value: 'annual', label: 'Annual' }]} />
                                </Grid>
                                <Grid xs={6}>
                                    <FormControl required><FormLabel>Payment Day</FormLabel><Input name="payment_day" type="number" min="1" max="31" defaultValue={charges.find(c => c.id === editingId)?.payment_day} /></FormControl>
                                </Grid>
                            </Grid>
                            <Checkbox label="Adjust for Nearest Working Day" name="adjust_for_working_day" defaultChecked={charges.find(c => c.id === editingId)?.adjust_for_working_day !== 0} value="1" />
                            <Box sx={{ mt: 3, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                <Button variant="plain" color="neutral" onClick={() => setOpen(false)}>Cancel</Button>
                                <Button type="submit" color="primary">{editingId ? 'Save Changes' : 'Create Charge'}</Button>
                            </Box>
                        </Stack>
                    </form>
                </DialogContent>
            </ModalDialog>
        </Modal>
    </Box>
  );
}
