import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Grid, Card, Avatar, IconButton, 
  Button, Modal, ModalDialog, DialogTitle, DialogContent, DialogActions, Input,
  FormControl, FormLabel, Stack, Chip, CircularProgress, Divider,
  AvatarGroup, Table, Sheet
} from '@mui/joy';
import { Edit, Delete, Add, GroupAdd, HourglassBottom } from '@mui/icons-material';
import { getEmojiColor } from '../../theme';
import EmojiPicker from '../../components/EmojiPicker';

const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return num.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function PensionsView() {
  const { api, id: householdId, user: currentUser, isDark, members } = useOutletContext();
  const [pensions, setPensions] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal States
  const [editItem, setEditItem] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [assignItem, setAssignItem] = useState(null);
  const [emojiPicker, setEmojiPicker] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState('⏳');
  const [selectedMembers, setSelectedMembers] = useState([]);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'member';

  useEffect(() => {
      if (editItem) {
          setSelectedEmoji(editItem.emoji || '⏳');
          const currentAssignees = getAssignees(editItem.id).map(m => m.id);
          setSelectedMembers(currentAssignees);
      } else if (isNew) {
          setSelectedEmoji('⏳');
          setSelectedMembers([currentUser?.id].filter(Boolean));
      }
  }, [editItem, isNew]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [penRes, assRes] = await Promise.all([
          api.get(`/households/${householdId}/finance/pensions`),
          api.get(`/households/${householdId}/finance/assignments?entity_type=finance_pensions`)
      ]);
      setPensions(penRes.data || []);
      setAssignments(assRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [api, householdId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    try {
      let itemId = editItem?.id;
      if (isNew) {
        const res = await api.post(`/households/${householdId}/finance/pensions`, data);
        itemId = res.data.id;
      } else {
        await api.put(`/households/${householdId}/finance/pensions/${itemId}`, data);
      }

      // Handle Assignments
      const currentIds = isNew ? [] : getAssignees(itemId).map(m => m.id);
      const toAdd = selectedMembers.filter(id => !currentIds.includes(id));
      await Promise.all(toAdd.map(mid => api.post(`/households/${householdId}/finance/assignments`, {
          entity_type: 'finance_pensions', entity_id: itemId, member_id: mid
      })));

      const toRemove = currentIds.filter(id => !selectedMembers.includes(id));
      await Promise.all(toRemove.map(mid => api.delete(`/households/${householdId}/finance/assignments/finance_pensions/${itemId}/${mid}`)));

      fetchData();
      setEditItem(null);
      setIsNew(false);
    } catch (err) { 
        alert("Failed to save pension: " + err.message); 
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this pension?")) return;
    try {
        await api.delete(`/households/${householdId}/finance/pensions/${id}`);
        fetchData();
    } catch (err) { alert("Failed to delete"); }
  };

  const handleAssignMember = async (memberId) => {
      try {
          await api.post(`/households/${householdId}/finance/assignments`, {
              entity_type: 'finance_pensions',
              entity_id: assignItem.id,
              member_id: memberId
          });
          const assRes = await api.get(`/households/${householdId}/finance/assignments?entity_type=finance_pensions`);
          setAssignments(assRes.data || []);
      } catch (err) { console.error(err); }
  };

  const handleUnassignMember = async (memberId) => {
      try {
          await api.delete(`/households/${householdId}/finance/assignments/finance_pensions/${assignItem.id}/${memberId}`);
          const assRes = await api.get(`/households/${householdId}/finance/assignments?entity_type=finance_pensions`);
          setAssignments(assRes.data || []);
      } catch (err) { console.error(err); }
  };

  const getAssignees = (itemId) => {
      return assignments.filter(a => a.entity_id === itemId).map(a => members.find(m => m.id === a.member_id)).filter(Boolean);
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  return (
    <Box>
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box>
                <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>Pensions</Typography>
                <Typography level="body-md" color="neutral">Plan for your future retirement.</Typography>
            </Box>
            {isAdmin && (
                <Button startDecorator={<Add />} onClick={() => { setEditItem({}); setIsNew(true); }}>
                    Add Pension
                </Button>
            )}
        </Box>

        <Grid container spacing={3}>
            {pensions.map(pen => {
                const currentValue = parseFloat(pen.current_value) || 0;
                const monthlyContribution = parseFloat(pen.monthly_contribution) || 0;

                return (
                    <Grid xs={12} lg={6} xl={4} key={pen.id}>
                        <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                <Avatar size="lg" sx={{ bgcolor: getEmojiColor(pen.emoji || '⏳', isDark) }}>
                                    {pen.emoji || '⏳'}
                                </Avatar>
                                <Box sx={{ flexGrow: 1 }}>
                                    <Typography level="title-lg">{pen.plan_name || 'Unnamed Plan'}</Typography>
                                    <Typography level="body-sm" color="neutral">{pen.provider} • {pen.type || 'Other'}</Typography>
                                </Box>
                                <Box sx={{ textAlign: 'right' }}>
                                    <Typography level="h3" color="primary">{formatCurrency(currentValue)}</Typography>
                                    <Typography level="body-xs" color="neutral">
                                        +{formatCurrency(monthlyContribution)}/mo
                                    </Typography>
                                </Box>
                            </Box>

                            <Divider />

                            <Box>
                                <Typography level="body-xs" color="neutral">Account Number</Typography>
                                <Typography level="body-sm">{pen.account_number || '••••••••'}</Typography>
                            </Box>

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto', pt: 2 }}>
                                <AvatarGroup size="sm">
                                    {getAssignees(pen.id).map(m => (
                                        <Avatar key={m.id} sx={{ bgcolor: getEmojiColor(m.emoji, isDark) }}>{m.emoji}</Avatar>
                                    ))}
                                    <IconButton size="sm" onClick={() => setAssignItem(pen)} sx={{ borderRadius: '50%' }}><GroupAdd /></IconButton>
                                </AvatarGroup>
                                <IconButton size="sm" onClick={() => { setEditItem(pen); setIsNew(false); }}><Edit /></IconButton>
                            </Box>
                        </Card>
                    </Grid>
                );
            })}
        </Grid>

        {/* MODAL: EDIT/ADD */}
        <Modal open={Boolean(editItem)} onClose={() => { setEditItem(null); setIsNew(false); }}>
            <ModalDialog sx={{ width: '100%', maxWidth: 500 }}>
                <DialogTitle>{isNew ? 'Add Pension' : 'Edit Pension'}</DialogTitle>
                <DialogContent>
                    <form onSubmit={handleSubmit}>
                        <Stack spacing={2} sx={{ mt: 1 }}>
                            <FormControl required>
                                <FormLabel>Plan Name</FormLabel>
                                <Input name="plan_name" defaultValue={editItem?.plan_name} placeholder="e.g. Workplace Pension" />
                            </FormControl>
                            <Grid container spacing={2}>
                                <Grid xs={6}>
                                    <FormControl required>
                                        <FormLabel>Provider</FormLabel>
                                        <Input name="provider" defaultValue={editItem?.provider} placeholder="e.g. Aviva" />
                                    </FormControl>
                                </Grid>
                                <Grid xs={6}>
                                    <FormControl>
                                        <FormLabel>Type</FormLabel>
                                        <Input name="type" defaultValue={editItem?.type} placeholder="e.g. SIPP, Workplace" />
                                    </FormControl>
                                </Grid>
                            </Grid>
                            <FormControl>
                                <FormLabel>Account Number (Encrypted)</FormLabel>
                                <Input name="account_number" defaultValue={editItem?.account_number} />
                            </FormControl>
                            <Grid container spacing={2}>
                                <Grid xs={6}>
                                    <FormControl required>
                                        <FormLabel>Current Value (£)</FormLabel>
                                        <Input name="current_value" type="number" step="0.01" defaultValue={editItem?.current_value} />
                                    </FormControl>
                                </Grid>
                                <Grid xs={6}>
                                    <FormControl>
                                        <FormLabel>Monthly Contribution (£)</FormLabel>
                                        <Input name="monthly_contribution" type="number" step="0.01" defaultValue={editItem?.monthly_contribution} />
                                    </FormControl>
                                </Grid>
                            </Grid>
                            <FormControl>
                                <FormLabel>Emoji</FormLabel>
                                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                    <Button variant="outlined" color="neutral" onClick={() => setEmojiPicker(true)} sx={{ minWidth: 48 }}>
                                        <Avatar size="sm" sx={{ bgcolor: getEmojiColor(selectedEmoji, isDark) }}>{selectedEmoji}</Avatar>
                                    </Button>
                                    <Input type="hidden" name="emoji" value={selectedEmoji} />
                                </Box>
                            </FormControl>
                            <FormControl>
                                <FormLabel>Assign Members</FormLabel>
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    {members.filter(m => m.type !== 'pet').map(m => {
                                        const isSelected = selectedMembers.includes(m.id);
                                        return (
                                            <Chip
                                                key={m.id}
                                                variant={isSelected ? 'solid' : 'outlined'}
                                                color={isSelected ? 'primary' : 'neutral'}
                                                onClick={() => setSelectedMembers(prev => prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id])}
                                                startDecorator={<Avatar size="sm">{m.emoji}</Avatar>}
                                            >
                                                {m.name}
                                            </Chip>
                                        );
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

        {/* MODAL: ASSIGNMENT */}
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
                                    {isAssigned ? (
                                        <Button size="sm" color="danger" variant="soft" onClick={() => handleUnassignMember(m.id)}>Remove</Button>
                                    ) : (
                                        <Button size="sm" variant="soft" onClick={() => handleAssignMember(m.id)}>Assign</Button>
                                    )}
                                </Box>
                            );
                        })}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAssignItem(null)}>Done</Button>
                </DialogActions>
            </ModalDialog>
        </Modal>

        <EmojiPicker 
            open={emojiPicker} 
            onClose={() => setEmojiPicker(false)}
            onEmojiSelect={(emoji) => { setSelectedEmoji(emoji); setEmojiPicker(false); }}
            isDark={isDark}
        />
    </Box>
  );
}