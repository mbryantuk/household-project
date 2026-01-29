import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext, useLocation, useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Grid, Card, Avatar, IconButton, 
  Button, Modal, ModalDialog, DialogTitle, DialogContent, Input,
  FormControl, FormLabel, Stack, Chip, CircularProgress, Divider,
  AvatarGroup, LinearProgress, Checkbox, DialogActions
} from '@mui/joy';
import { Edit, Delete, Add, GroupAdd } from '@mui/icons-material';
import { getEmojiColor } from '../../theme';
import EmojiPicker from '../../components/EmojiPicker';
import AppSelect from '../../components/ui/AppSelect';

const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return num.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function AgreementsView({ isSubscriptions = false }) {
  const { api, id: householdId, user: currentUser, isDark, members, showNotification } = useOutletContext();
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const selectedAgreementId = queryParams.get('selectedAgreementId');

  const [items, setItems] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [assignItem, setAssignItem] = useState(null);
  const [emojiPicker, setEmojiPicker] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState(isSubscriptions ? '📱' : '📄');
  const [selectedMembers, setSelectedMembers] = useState([]);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'member';

  const getAssignees = useCallback((itemId) => assignments.filter(a => a.entity_id === itemId).map(a => members.find(m => m.id === a.member_id)).filter(Boolean), [assignments, members]);

  const selectedAgreement = useMemo(() => 
    items.find(i => String(i.id) === String(selectedAgreementId)),
  [items, selectedAgreementId]);

  useEffect(() => {
      if (selectedAgreement) {
          setSelectedEmoji(selectedAgreement.emoji || (isSubscriptions ? '📱' : '📄'));
          setSelectedMembers(getAssignees(selectedAgreement.id).map(m => m.id));
      } else if (selectedAgreementId === 'new') {
          setSelectedEmoji(isSubscriptions ? '📱' : '📄');
          setSelectedMembers([currentUser?.id].filter(Boolean));
      }
  }, [selectedAgreement, selectedAgreementId, isSubscriptions, getAssignees, currentUser?.id]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [res, assRes] = await Promise.all([
          api.get(`/households/${householdId}/finance/agreements`),
          api.get(`/households/${householdId}/finance/assignments?entity_type=finance_agreements`)
      ]);
      setItems(res.data || []);
      setAssignments(assRes.data || []);
    } catch (err) { console.error("Failed to fetch agreements", err); } finally { setLoading(false); }
  }, [api, householdId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const setAgreementId = (id) => {
    const newParams = new URLSearchParams(location.search);
    if (id) newParams.set('selectedAgreementId', id);
    else newParams.delete('selectedAgreementId');
    navigate(`?${newParams.toString()}`, { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    data.emoji = selectedEmoji;
    
    // Tag as subscription if in sub mode
    if (isSubscriptions) data.notes = (data.notes || '') + ' [SUB]';

    try {
      let itemId = selectedAgreementId;
      if (selectedAgreementId === 'new') {
        const res = await api.post(`/households/${householdId}/finance/agreements`, data);
        itemId = res.data.id;
        showNotification("Agreement added.", "success");
      } else {
        await api.put(`/households/${householdId}/finance/agreements/${itemId}`, data);
        showNotification("Agreement updated.", "success");
      }
      const currentIds = selectedAgreementId === 'new' ? [] : getAssignees(itemId).map(m => m.id);
      const toAdd = selectedMembers.filter(id => !currentIds.includes(id));
      await Promise.all(toAdd.map(mid => api.post(`/households/${householdId}/finance/assignments`, {
          entity_type: 'finance_agreements', entity_id: itemId, member_id: mid
      })));
      const toRemove = currentIds.filter(id => !selectedMembers.includes(id));
      await Promise.all(toRemove.map(mid => api.delete(`/households/${householdId}/finance/assignments/finance_agreements/${itemId}/${mid}`)));
      
      await fetchData();
      setAgreementId(itemId);
    } catch (err) { showNotification("Failed to save: " + err.message, "danger"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this item?")) return;
    try { 
        await api.delete(`/households/${householdId}/finance/agreements/${id}`); 
        fetchData(); 
        if (selectedAgreementId === String(id)) setAgreementId(null);
    } catch { alert("Failed to delete"); }
  };

  const handleAssignMember = async (memberId) => {
      try {
          await api.post(`/households/${householdId}/finance/assignments`, {
              entity_type: 'finance_agreements', entity_id: assignItem.id, member_id: memberId
          });
          const assRes = await api.get(`/households/${householdId}/finance/assignments?entity_type=finance_agreements`);
          setAssignments(assRes.data || []);
      } catch (err) { console.error("Assignment failed", err); }
  };

  const handleUnassignMember = async (memberId) => {
      try {
          await api.delete(`/households/${householdId}/finance/assignments/finance_agreements/${assignItem.id}/${memberId}`);
          const assRes = await api.get(`/households/${householdId}/finance/assignments?entity_type=finance_agreements`);
          setAssignments(assRes.data || []);
      } catch (err) { console.error("Removal failed", err); }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  return (
    <Box>
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box>
                <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>
                    {isSubscriptions ? 'Subscriptions' : 'Agreements & Contracts'}
                </Typography>
                <Typography level="body-md" color="neutral">
                    {isSubscriptions ? 'Manage rolling services and digital subscriptions.' : 'Track fixed-term contracts and financial obligations.'}
                </Typography>
            </Box>
            {isAdmin && (
                <Button startDecorator={<Add />} onClick={() => setAgreementId('new')}>
                    Add {isSubscriptions ? 'Subscription' : 'Agreement'}
                </Button>
            )}
        </Box>

        <Grid container spacing={3}>
            {items.map(item => {
                const total = parseFloat(item.total_amount) || 0;
                const remaining = parseFloat(item.remaining_balance) || 0;
                const progress = total > 0 ? ((total - remaining) / total) * 100 : 0;

                return (
                    <Grid xs={12} lg={6} xl={4} key={item.id}>
                        <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                <Avatar size="lg" sx={{ bgcolor: getEmojiColor(item.emoji || (isSubscriptions ? '📱' : '📄'), isDark) }}>
                                    {item.emoji || (isSubscriptions ? '📱' : '📄')}
                                </Avatar>
                                <Box sx={{ flexGrow: 1 }}>
                                    <Typography level="title-lg">{item.agreement_name}</Typography>
                                    <Typography level="body-sm" color="neutral">{item.provider}</Typography>
                                </Box>
                                <Box sx={{ textAlign: 'right' }}>
                                    {remaining > 0 ? (
                                        <>
                                            <Typography level="h3" color="danger">{formatCurrency(remaining)}</Typography>
                                            <Typography level="body-xs" color="neutral">of {formatCurrency(total)}</Typography>
                                        </>
                                    ) : (
                                        <Typography level="h3">{formatCurrency(item.monthly_payment)}<Typography level="body-xs" color="neutral">/mo</Typography></Typography>
                                    )}
                                </Box>
                            </Box>

                            {total > 0 && (
                                <Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                        <Typography level="body-xs">Contract Progress</Typography>
                                        <Typography level="body-xs" fontWeight="bold">{progress.toFixed(2)}%</Typography>
                                    </Box>
                                    <LinearProgress determinate value={Math.min(progress, 100)} color="success" />
                                </Box>
                            )}

                            <Grid container spacing={2}>
                                <Grid xs={6}>
                                    <Typography level="body-xs" color="neutral">Monthly Payment</Typography>
                                    <Typography level="body-sm">{formatCurrency(item.monthly_payment)}</Typography>
                                </Grid>
                                <Grid xs={6}>
                                    <Typography level="body-xs" color="neutral">Payment Day</Typography>
                                    <Typography level="body-sm">{item.payment_day || '-'}</Typography>
                                </Grid>
                                <Grid xs={12}>
                                    <Typography level="body-xs" color="neutral">Period</Typography>
                                    <Typography level="body-sm">{item.start_date || 'N/A'} to {item.end_date || 'Ongoing'}</Typography>
                                </Grid>
                            </Grid>

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto', pt: 2 }}>
                                <AvatarGroup size="sm">
                                    {getAssignees(item.id).map(m => (
                                        <Avatar key={m.id} sx={{ bgcolor: getEmojiColor(m.emoji, isDark) }}>{m.emoji}</Avatar>
                                    ))}
                                    <IconButton size="sm" onClick={() => setAssignItem(item)} sx={{ borderRadius: '50%' }}><GroupAdd /></IconButton>
                                </AvatarGroup>
                                <IconButton size="sm" onClick={() => setAgreementId(item.id)}><Edit /></IconButton>
                            </Box>
                        </Card>
                    </Grid>
                );
            })}
        </Grid>

        <Modal open={Boolean(selectedAgreementId)} onClose={() => setAgreementId(null)}>
            <ModalDialog sx={{ width: '100%', maxWidth: 500 }}>
                <DialogTitle>{selectedAgreementId === 'new' ? (isSubscriptions ? 'Add Subscription' : 'Add Agreement') : 'Edit Details'}</DialogTitle>
                <DialogContent>
                    <form onSubmit={handleSubmit}>
                        <Stack spacing={2} sx={{ mt: 1 }}>
                            <Grid container spacing={2}>
                                <Grid xs={12}>
                                    <FormControl required><FormLabel>Service / Agreement Name</FormLabel><Input name="agreement_name" defaultValue={selectedAgreement?.agreement_name} placeholder="e.g. Netflix / iPhone 15" /></FormControl>
                                </Grid>
                                <Grid xs={12}>
                                    <FormControl required><FormLabel>Provider</FormLabel><Input name="provider" defaultValue={selectedAgreement?.provider} placeholder="e.g. Amazon / EE" /></FormControl>
                                </Grid>
                            </Grid>
                            
                            <Grid container spacing={2}>
                                <Grid xs={6}>
                                    <FormControl required><FormLabel>Monthly Cost (£)</FormLabel>
                                        <Input name="monthly_payment" type="number" slotProps={{ input: { step: 'any' } }} defaultValue={selectedAgreement?.monthly_payment} />
                                    </FormControl>
                                </Grid>
                        <Grid xs={6}>
                            <FormControl>
                                <FormLabel>Payment Day</FormLabel>
                                <Input name="payment_day" type="number" min="1" max="31" defaultValue={selectedAgreement?.payment_day} />
                            </FormControl>
                        </Grid>
                        <Grid xs={6} sx={{ display: 'flex', alignItems: 'center' }}>
                            <Checkbox 
                                label="Nearest Working Day (Next)" 
                                name="nearest_working_day"
                                defaultChecked={selectedAgreement?.nearest_working_day !== 0}
                                value="1"
                                sx={{ mt: 3 }}
                            />
                        </Grid>
                            </Grid>

                            {!isSubscriptions && (
                                <Grid container spacing={2}>
                                    <Grid xs={6}>
                                        <FormControl><FormLabel>Total Commitment (£)</FormLabel><Input name="total_amount" type="number" slotProps={{ input: { step: 'any' } }} defaultValue={selectedAgreement?.total_amount} /></FormControl>
                                    </Grid>
                                    <Grid xs={6}>
                                        <FormControl><FormLabel>Remaining (£)</FormLabel><Input name="remaining_balance" type="number" slotProps={{ input: { step: 'any' } }} defaultValue={selectedAgreement?.remaining_balance} /></FormControl>
                                    </Grid>
                                </Grid>
                            )}

                            <Grid container spacing={2}>
                                <Grid xs={6}>
                                    <FormControl><FormLabel>Start Date</FormLabel><Input name="start_date" type="date" defaultValue={selectedAgreement?.start_date} /></FormControl>
                                </Grid>
                                <Grid xs={6}>
                                    <FormControl><FormLabel>End Date / Renewal</FormLabel><Input name="end_date" type="date" defaultValue={selectedAgreement?.end_date} /></FormControl>
                                </Grid>
                            </Grid>

                            <FormControl><FormLabel>Emoji</FormLabel>
                                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                    <Button variant="outlined" color="neutral" onClick={() => setEmojiPicker(true)} sx={{ minWidth: 48 }}><Avatar size="sm" sx={{ bgcolor: getEmojiColor(selectedEmoji, isDark) }}>{selectedEmoji}</Avatar></Button>
                                    <input type="hidden" name="emoji" value={selectedEmoji} />
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
                            {selectedAgreementId !== 'new' && <Button color="danger" variant="soft" onClick={() => handleDelete(selectedAgreement.id)}>Delete</Button>}
                            <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
                                <Button variant="plain" color="neutral" onClick={() => setAgreementId(null)}>Cancel</Button>
                                <Button type="submit">Save</Button>
                            </Box>
                        </Box>
                    </form>
                </DialogContent>
            </ModalDialog>
        </Modal>

        <Modal open={Boolean(assignItem)} onClose={() => setAssignItem(null)}>
            <ModalDialog size="sm">
                <DialogTitle>Assign Users</DialogTitle>
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
