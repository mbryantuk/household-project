import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext, useLocation, useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Grid, Card, Avatar, IconButton, 
  Button, Modal, ModalDialog, DialogTitle, DialogContent, DialogActions, Input,
  FormControl, FormLabel, Stack, Chip, CircularProgress, Divider,
  AvatarGroup, LinearProgress, Checkbox
} from '@mui/joy';
import { Edit, Delete, Add, GroupAdd } from '@mui/icons-material';
import { getEmojiColor } from '../../theme';
import EmojiPicker from '../../components/EmojiPicker';

const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return num.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatPercent = (val) => {
    const num = parseFloat(val) || 0;
    return num.toFixed(2) + '%';
};

export default function CreditCardsView() {
  const { api, id: householdId, user: currentUser, isDark, members, showNotification } = useOutletContext();
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const selectedCardId = queryParams.get('selectedCardId');

  const [cards, setCards] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [assignItem, setAssignItem] = useState(null);
  const [emojiPicker, setEmojiPicker] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState('💳');
  const [selectedMembers, setSelectedMembers] = useState([]);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'member';

  const getAssignees = useCallback((itemId) => assignments.filter(a => a.entity_id === itemId).map(a => members.find(m => m.id === a.member_id)).filter(Boolean), [assignments, members]);

  const selectedCard = useMemo(() => 
    cards.find(c => String(c.id) === String(selectedCardId)),
  [cards, selectedCardId]);

  useEffect(() => {
      if (selectedCard) {
          setSelectedEmoji(selectedCard.emoji || '💳');
          setSelectedMembers(getAssignees(selectedCard.id).map(m => m.id));
      } else if (selectedCardId === 'new') {
          setSelectedEmoji('💳');
          const defaultMember = members.find(m => m.type !== 'pet');
          setSelectedMembers(defaultMember ? [defaultMember.id] : []);
      }
  }, [selectedCard, selectedCardId, getAssignees, currentUser?.id, members]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [res, assRes] = await Promise.all([
          api.get(`/households/${householdId}/finance/credit-cards`),
          api.get(`/households/${householdId}/finance/assignments?entity_type=finance_credit_cards`)
      ]);
      setCards(res.data || []);
      setAssignments(assRes.data || []);
    } catch (err) { console.error("Failed to fetch cards", err); } finally { setLoading(false); }
  }, [api, householdId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const setCardId = (id) => {
    const newParams = new URLSearchParams(location.search);
    if (id) newParams.set('selectedCardId', id);
    else newParams.delete('selectedCardId');
    navigate(`?${newParams.toString()}`, { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    data.emoji = selectedEmoji;
    try {
      let itemId = selectedCardId;
      if (selectedCardId === 'new') {
        const res = await api.post(`/households/${householdId}/finance/credit-cards`, data);
        itemId = res.data.id;
        showNotification("Credit card added.", "success");
      } else {
        await api.put(`/households/${householdId}/finance/credit-cards/${itemId}`, data);
        showNotification("Credit card updated.", "success");
      }
      const currentIds = selectedCardId === 'new' ? [] : getAssignees(itemId).map(m => m.id);
      const toAdd = selectedMembers.filter(id => !currentIds.includes(id));
      await Promise.all(toAdd.map(mid => api.post(`/households/${householdId}/finance/assignments`, {
          entity_type: 'finance_credit_cards', entity_id: itemId, member_id: mid
      })));
      const toRemove = currentIds.filter(id => !selectedMembers.includes(id));
      await Promise.all(toRemove.map(mid => api.delete(`/households/${householdId}/finance/assignments/finance_credit_cards/${itemId}/${mid}`)));
      
      await fetchData();
      setCardId(null);
    } catch (err) { showNotification("Failed to save: " + err.message, "danger"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this card?")) return;
    try { 
        await api.delete(`/households/${householdId}/finance/credit-cards/${id}`); 
        fetchData(); 
        if (selectedCardId === String(id)) setCardId(null);
    } catch { alert("Failed to delete"); }
  };

  const handleAssignMember = async (memberId) => {
      try {
          await api.post(`/households/${householdId}/finance/assignments`, {
              entity_type: 'finance_credit_cards', entity_id: assignItem.id, member_id: memberId
          });
          const assRes = await api.get(`/households/${householdId}/finance/assignments?entity_type=finance_credit_cards`);
          setAssignments(assRes.data || []);
      } catch (err) { console.error("Assignment failed", err); }
  };

  const handleUnassignMember = async (memberId) => {
      try {
          await api.delete(`/households/${householdId}/finance/assignments/finance_credit_cards/${assignItem.id}/${memberId}`);
          const assRes = await api.get(`/households/${householdId}/finance/assignments?entity_type=finance_credit_cards`);
          setAssignments(assRes.data || []);
      } catch (err) { console.error("Removal failed", err); }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  return (
    <Box>
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box>
                <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>Credit Cards</Typography>
                <Typography level="body-md" color="neutral">Track credit utilization and repayments.</Typography>
            </Box>
            {isAdmin && (
                <Button startDecorator={<Add />} onClick={() => setCardId('new')}>
                    Add Card
                </Button>
            )}
        </Box>

        <Grid container spacing={3}>
            {cards.map(card => {
                const limit = parseFloat(card.credit_limit) || 0;
                const balance = parseFloat(card.current_balance) || 0;
                const utilization = limit > 0 ? (balance / limit) * 100 : 0;

                return (
                    <Grid xs={12} lg={6} xl={4} key={card.id}>
                        <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                <Avatar size="lg" sx={{ bgcolor: getEmojiColor(card.emoji || '💳', isDark) }}>
                                    {card.emoji || '💳'}
                                </Avatar>
                                <Box sx={{ flexGrow: 1 }}>
                                    <Typography level="title-lg">{card.card_name}</Typography>
                                    <Typography level="body-sm" color="neutral">{card.provider}</Typography>
                                </Box>
                                <Box sx={{ textAlign: 'right' }}>
                                    <Typography level="h3" color={utilization > 80 ? 'danger' : 'neutral'}>{formatCurrency(balance)}</Typography>
                                    <Typography level="body-xs" color="neutral">of {formatCurrency(limit)} limit</Typography>
                                </Box>
                            </Box>

                            <Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                    <Typography level="body-xs">Utilization</Typography>
                                    <Typography level="body-xs" fontWeight="bold">{utilization.toFixed(2)}%</Typography>
                                </Box>
                                <LinearProgress determinate value={Math.min(utilization, 100)} color={utilization > 80 ? 'danger' : (utilization > 50 ? 'warning' : 'success')} />
                            </Box>

                            <Grid container spacing={2}>
                                <Grid xs={6}>
                                    <Typography level="body-xs" color="neutral">APR</Typography>
                                    <Typography level="body-sm">{formatPercent(card.apr)}</Typography>
                                </Grid>
                                <Grid xs={6}>
                                    <Typography level="body-xs" color="neutral">Payment Day</Typography>
                                    <Typography level="body-sm">{card.payment_day || '-'}</Typography>
                                </Grid>
                            </Grid>

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto', pt: 2 }}>
                                <AvatarGroup size="sm">
                                    {getAssignees(card.id).map(m => (
                                        <Avatar key={m.id} sx={{ bgcolor: getEmojiColor(m.emoji, isDark) }}>{m.emoji}</Avatar>
                                    ))}
                                    <IconButton size="sm" onClick={() => setAssignItem(card)} sx={{ borderRadius: '50%' }}><GroupAdd /></IconButton>
                                </AvatarGroup>
                                <IconButton size="sm" onClick={() => setCardId(card.id)}><Edit /></IconButton>
                            </Box>
                        </Card>
                    </Grid>
                );
            })}
        </Grid>

        <Modal open={Boolean(selectedCardId)} onClose={() => setCardId(null)}>
            <ModalDialog sx={{ width: '100%', maxWidth: 500 }}>
                <DialogTitle>{selectedCardId === 'new' ? 'Add Card' : 'Edit Card'}</DialogTitle>
                <DialogContent>
                    <form onSubmit={handleSubmit}>
                        <Stack spacing={2} sx={{ mt: 1 }}>
                            <Grid container spacing={2}>
                                <Grid xs={6}>
                                    <FormControl required><FormLabel>Provider</FormLabel><Input name="provider" defaultValue={selectedCard?.provider} placeholder="e.g. Amex" /></FormControl>
                                </Grid>
                                <Grid xs={6}>
                                    <FormControl required><FormLabel>Card Name</FormLabel><Input name="card_name" defaultValue={selectedCard?.card_name} placeholder="e.g. Gold" /></FormControl>
                                </Grid>
                            </Grid>
                            <FormControl><FormLabel>Account Number</FormLabel><Input name="account_number" defaultValue={selectedCard?.account_number} /></FormControl>
                            <Grid container spacing={2}>
                                <Grid xs={6}>
                                    <FormControl required><FormLabel>Credit Limit (£)</FormLabel>
                                        <Input name="credit_limit" type="number" slotProps={{ input: { step: 'any' } }} defaultValue={selectedCard?.credit_limit} />
                                    </FormControl>
                                </Grid>
                                <Grid xs={6}>
                                    <FormControl required><FormLabel>Current Balance (£)</FormLabel>
                                        <Input name="current_balance" type="number" slotProps={{ input: { step: 'any' } }} defaultValue={selectedCard?.current_balance} />
                                    </FormControl>
                                </Grid>
                                <Grid xs={6}>
                                    <FormControl><FormLabel>APR (%)</FormLabel>
                                        <Input name="apr" type="number" slotProps={{ input: { step: 'any' } }} defaultValue={selectedCard?.apr} />
                                    </FormControl>
                                </Grid>
                        <Grid xs={12} sm={6} md={3}>
                            <FormControl required>
                                <FormLabel>Payment Day</FormLabel>
                                <Input name="payment_day" type="number" min="1" max="31" defaultValue={selectedCard?.payment_day} placeholder="e.g. 25" />
                            </FormControl>
                        </Grid>
                        <Grid xs={12} sm={6} md={3}>
                            <Checkbox 
                                label="Nearest Working Day (Next)" 
                                name="nearest_working_day"
                                defaultChecked={selectedCard?.nearest_working_day !== 0}
                                value="1"
                                sx={{ mt: 4 }}
                            />
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
                            {selectedCardId !== 'new' && <Button color="danger" variant="soft" onClick={() => { handleDelete(selectedCard.id); }}>Delete</Button>}
                            <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
                                <Button variant="plain" color="neutral" onClick={() => setCardId(null)}>Cancel</Button>
                                <Button type="submit">Save</Button>
                            </Box>
                        </Box>
                    </form>
                </DialogContent>
            </ModalDialog>
        </Modal>

        <Modal open={Boolean(assignItem)} onClose={() => setAssignItem(null)}>
            <ModalDialog size="sm">
                <DialogTitle>Assign Card Holders</DialogTitle>
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