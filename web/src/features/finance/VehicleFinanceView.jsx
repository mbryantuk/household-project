import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Grid, Card, Avatar, IconButton, 
  Button, Modal, ModalDialog, DialogTitle, DialogContent, DialogActions, Input,
  FormControl, FormLabel, Stack, Chip, CircularProgress, Divider,
  AvatarGroup, LinearProgress, Select, Option
} from '@mui/joy';
import { Edit, Delete, Add, GroupAdd, DirectionsCar } from '@mui/icons-material';
import { getEmojiColor } from '../../theme';
import EmojiPicker from '../../components/EmojiPicker';
import AppSelect from '../../components/ui/AppSelect';

export default function VehicleFinanceView() {
  const { api, id: householdId, user: currentUser, isDark, members } = useOutletContext();
  const [finances, setFinances] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [editItem, setEditItem] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [assignItem, setAssignItem] = useState(null);
  const [emojiPicker, setEmojiPicker] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState('🚗');
  const [selectedMembers, setSelectedMembers] = useState([]);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'member';

  useEffect(() => {
      if (editItem) {
          setSelectedEmoji(editItem.emoji || '🚗');
          setSelectedMembers(getAssignees(editItem.id).map(m => m.id));
      } else if (isNew) {
          setSelectedEmoji('🚗');
          setSelectedMembers([currentUser?.id].filter(Boolean));
      }
  }, [editItem, isNew]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [res, vRes, assRes] = await Promise.all([
          api.get(`/households/${householdId}/finance/vehicle-finance`),
          api.get(`/households/${householdId}/vehicles`),
          api.get(`/households/${householdId}/finance/assignments?entity_type=vehicle_finance`)
      ]);
      setFinances(res.data || []);
      setVehicles(vRes.data || []);
      setAssignments(assRes.data || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [api, householdId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    try {
      let itemId = editItem?.id;
      if (isNew) {
        const res = await api.post(`/households/${householdId}/finance/vehicle-finance`, data);
        itemId = res.data.id;
      } else {
        await api.put(`/households/${householdId}/finance/vehicle-finance/${itemId}`, data);
      }
      const currentIds = isNew ? [] : getAssignees(itemId).map(m => m.id);
      const toAdd = selectedMembers.filter(id => !currentIds.includes(id));
      await Promise.all(toAdd.map(mid => api.post(`/households/${householdId}/finance/assignments`, {
          entity_type: 'vehicle_finance', entity_id: itemId, member_id: mid
      })));
      const toRemove = currentIds.filter(id => !selectedMembers.includes(id));
      await Promise.all(toRemove.map(mid => api.delete(`/households/${householdId}/finance/assignments/vehicle_finance/${itemId}/${mid}`)));
      fetchData();
      setEditItem(null);
      setIsNew(false);
    } catch (err) { alert("Failed to save: " + err.message); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this finance agreement?")) return;
    try { await api.delete(`/households/${householdId}/finance/vehicle-finance/${id}`); fetchData(); } catch (err) { alert("Failed to delete"); }
  };

  const handleAssignMember = async (memberId) => {
      try {
          await api.post(`/households/${householdId}/finance/assignments`, {
              entity_type: 'vehicle_finance', entity_id: assignItem.id, member_id: memberId
          });
          const assRes = await api.get(`/households/${householdId}/finance/assignments?entity_type=vehicle_finance`);
          setAssignments(assRes.data || []);
      } catch (err) { console.error(err); }
  };

  const handleUnassignMember = async (memberId) => {
      try {
          await api.delete(`/households/${householdId}/finance/assignments/vehicle_finance/${assignItem.id}/${memberId}`);
          const assRes = await api.get(`/households/${householdId}/finance/assignments?entity_type=vehicle_finance`);
          setAssignments(assRes.data || []);
      } catch (err) { console.error(err); }
  };

  const getAssignees = (itemId) => assignments.filter(a => a.entity_id === itemId).map(a => members.find(m => m.id === a.member_id)).filter(Boolean);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  return (
    <Box>
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box>
                <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>Car Finance</Typography>
                <Typography level="body-md" color="neutral">Track loans and leases for your fleet.</Typography>
            </Box>
            {isAdmin && (
                <Button startDecorator={<Add />} onClick={() => { setEditItem({}); setIsNew(true); }}>
                    Add Agreement
                </Button>
            )}
        </Box>

        <Grid container spacing={3}>
            {finances.map(fin => {
                const vehicle = vehicles.find(v => v.id === fin.vehicle_id);
                const total = parseFloat(fin.total_amount) || 0;
                const remaining = parseFloat(fin.remaining_balance) || 0;
                const progress = total > 0 ? ((total - remaining) / total) * 100 : 0;

                return (
                    <Grid xs={12} lg={6} xl={4} key={fin.id}>
                        <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                <Avatar size="lg" sx={{ bgcolor: getEmojiColor(fin.emoji || '🚗', isDark) }}>
                                    {fin.emoji || '🚗'}
                                </Avatar>
                                <Box sx={{ flexGrow: 1 }}>
                                    <Typography level="title-lg">{fin.provider}</Typography>
                                    <Typography level="body-sm" color="neutral">
                                        {vehicle ? `${vehicle.make} ${vehicle.model}` : 'Unlinked Vehicle'}
                                    </Typography>
                                </Box>
                                <Box sx={{ textAlign: 'right' }}>
                                    <Typography level="h3" color="danger">£{remaining.toLocaleString()}</Typography>
                                    <Typography level="body-xs" color="neutral">of £{total.toLocaleString()}</Typography>
                                </Box>
                            </Box>

                            <Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                    <Typography level="body-xs">Payoff Progress</Typography>
                                    <Typography level="body-xs" fontWeight="bold">{progress.toFixed(1)}%</Typography>
                                </Box>
                                <LinearProgress determinate value={Math.min(progress, 100)} color="success" />
                            </Box>

                            <Grid container spacing={2}>
                                <Grid xs={6}>
                                    <Typography level="body-xs" color="neutral">Monthly Payment</Typography>
                                    <Typography level="body-sm">£{fin.monthly_payment?.toLocaleString()}</Typography>
                                </Grid>
                                <Grid xs={6}>
                                    <Typography level="body-xs" color="neutral">Interest Rate</Typography>
                                    <Typography level="body-sm">{fin.interest_rate}%</Typography>
                                </Grid>
                                <Grid xs={12}>
                                    <Typography level="body-xs" color="neutral">Term</Typography>
                                    <Typography level="body-sm">{fin.start_date} to {fin.end_date || 'Ongoing'}</Typography>
                                </Grid>
                            </Grid>

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto', pt: 2 }}>
                                <AvatarGroup size="sm">
                                    {getAssignees(fin.id).map(m => (
                                        <Avatar key={m.id} sx={{ bgcolor: getEmojiColor(m.emoji, isDark) }}>{m.emoji}</Avatar>
                                    ))}
                                    <IconButton size="sm" onClick={() => setAssignItem(fin)} sx={{ borderRadius: '50%' }}><GroupAdd /></IconButton>
                                </AvatarGroup>
                                <IconButton size="sm" onClick={() => { setEditItem(fin); setIsNew(false); }}><Edit /></IconButton>
                            </Box>
                        </Card>
                    </Grid>
                );
            })}
        </Grid>

        <Modal open={Boolean(editItem)} onClose={() => { setEditItem(null); setIsNew(false); }}>
            <ModalDialog sx={{ width: '100%', maxWidth: 500 }}>
                <DialogTitle>{isNew ? 'Add Car Finance' : 'Edit Agreement'}</DialogTitle>
                <DialogContent>
                    <form onSubmit={handleSubmit}>
                        <Stack spacing={2} sx={{ mt: 1 }}>
                            <FormControl required>
                                <FormLabel>Vehicle</FormLabel>
                                <AppSelect 
                                    name="vehicle_id" 
                                    defaultValue={String(editItem?.vehicle_id || '')}
                                    options={vehicles.map(v => ({ value: String(v.id), label: `${v.emoji} ${v.make} ${v.model} (${v.registration})` }))}
                                    placeholder="Select Vehicle"
                                />
                            </FormControl>
                            <FormControl required><FormLabel>Provider</FormLabel><Input name="provider" defaultValue={editItem?.provider} placeholder="e.g. VW Finance" /></FormControl>
                            <FormControl><FormLabel>Account Number</FormLabel><Input name="account_number" defaultValue={editItem?.account_number} /></FormControl>
                            <Grid container spacing={2}>
                                <Grid xs={6}>
                                    <FormControl required><FormLabel>Total Amount (£)</FormLabel><Input name="total_amount" type="number" step="0.01" defaultValue={editItem?.total_amount} /></FormControl>
                                </Grid>
                                <Grid xs={6}>
                                    <FormControl required><FormLabel>Remaining Balance (£)</FormLabel><Input name="remaining_balance" type="number" step="0.01" defaultValue={editItem?.remaining_balance} /></FormControl>
                                </Grid>
                                <Grid xs={6}>
                                    <FormControl><FormLabel>Interest Rate (%)</FormLabel><Input name="interest_rate" type="number" step="0.01" defaultValue={editItem?.interest_rate} /></FormControl>
                                </Grid>
                                <Grid xs={6}>
                                    <FormControl><FormLabel>Monthly Payment (£)</FormLabel><Input name="monthly_payment" type="number" step="0.01" defaultValue={editItem?.monthly_payment} /></FormControl>
                                </Grid>
                                <Grid xs={6}>
                                    <FormControl><FormLabel>Start Date</FormLabel><Input name="start_date" type="date" defaultValue={editItem?.start_date} /></FormControl>
                                </Grid>
                                <Grid xs={6}>
                                    <FormControl><FormLabel>End Date</FormLabel><Input name="end_date" type="date" defaultValue={editItem?.end_date} /></FormControl>
                                </Grid>
                            </Grid>
                            <FormControl><FormLabel>Emoji</FormLabel>
                                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                    <Button variant="outlined" color="neutral" onClick={() => setEmojiPicker(true)} sx={{ minWidth: 48 }}><Avatar size="sm" sx={{ bgcolor: getEmojiColor(selectedEmoji, isDark) }}>{selectedEmoji}</Avatar></Button>
                                    <Input type="hidden" name="emoji" value={selectedEmoji} />
                                </Box>
                            </FormControl>
                            <FormControl><FormLabel>Assign Members</FormLabel>
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    {members.filter(m => m.type !== 'pet').map(m => {
                                        const isSelected = selectedMembers.includes(m.id);
                                        return <Chip key={m.id} variant={isSelected ? 'solid' : 'outlined'} color={isSelected ? 'primary' : 'neutral'} onClick={() => setSelectedMembers(prev => prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id])} startDecorator={<Avatar size="sm">{m.emoji}</Avatar>}>{m.name}</Chip>
                                    })}
                                </Box>
                            </FormControl>
                        </Stack>
                        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
                            {!isNew && <Button color="danger" variant="soft" onClick={() => { handleDelete(editItem.id); setEditItem(null); }}>Delete</Button>}
                            <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
                                <Button variant="plain" color="neutral" onClick={() => { setEditItem(null); setIsNew(false); }}>Cancel</Button>
                                <Button type="submit">Save</Button>
                            </Box>
                        </Box>
                    </form>
                </DialogContent>
            </ModalDialog>
        </Modal>

        <Modal open={Boolean(assignItem)} onClose={() => setAssignItem(null)}>
            <ModalDialog size="sm">
                <DialogTitle>Assign Owners</DialogTitle>
                <DialogContent>
                    <Stack spacing={1}>
                        {members.filter(m => m.type !== 'pet').map(m => {
                            const isAssigned = getAssignees(assignItem?.id).some(a => a.id === m.id);
                            return (
                                <Box key={m.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 'sm' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Avatar size="sm" sx={{ bgcolor: getEmojiColor(m.emoji, isDark) }}>{m.emoji}</Avatar>
                                        <Typography>{m.name}</Typography>
                                    </Box>
                                    {isAssigned ? <Button size="sm" color="danger" variant="soft" onClick={() => handleUnassignMember(m.id)}>Remove</Button> : <Button size="sm" variant="soft" onClick={() => handleAssignMember(m.id)}>Assign</Button>}
                                </Box>
                            );
                        })}
                    </Stack>
                </DialogContent>
                <DialogActions><Button onClick={() => setAssignItem(null)}>Done</Button></DialogActions>
            </ModalDialog>
        </Modal>

        <EmojiPicker open={emojiPicker} onClose={() => setEmojiPicker(false)} onEmojiSelect={(emoji) => { setSelectedEmoji(emoji); setEmojiPicker(false); }} isDark={isDark} />
    </Box>
  );
}