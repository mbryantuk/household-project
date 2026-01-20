import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Grid, Card, Avatar, IconButton, 
  Button, Modal, ModalDialog, DialogTitle, DialogContent, DialogActions, Input,
  FormControl, FormLabel, Stack, Chip, CircularProgress, Divider,
  AvatarGroup, LinearProgress, Accordion, AccordionSummary, AccordionDetails, Table
} from '@mui/joy';
import { Edit, Delete, Add, GroupAdd, ExpandMore, Savings, TrendingUp, Remove } from '@mui/icons-material';
import { getEmojiColor } from '../../theme';
import EmojiPicker from '../../components/EmojiPicker';
import AppSelect from '../../components/ui/AppSelect';

export default function SavingsView() {
  const { api, id: householdId, user: currentUser, isDark, members } = useOutletContext();
  const [accounts, setAccounts] = useState([]);
  const [pots, setPots] = useState({}); // Map of savingsId -> [pots]
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal States
  const [editAccount, setEditAccount] = useState(null);
  const [isNewAccount, setIsNewAccount] = useState(false);
  const [editPot, setEditPot] = useState(null); // { savingsId, pot: {} }
  const [adjustPot, setAdjustPot] = useState(null); // { savingsId, pot, type: 'add'|'remove' }
  const [assignItem, setAssignItem] = useState(null);
  const [emojiPicker, setEmojiPicker] = useState({ open: false, type: null }); // type: 'account' | 'pot'
  const [selectedEmoji, setSelectedEmoji] = useState(null);
  const [selectedMembers, setSelectedMembers] = useState([]);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'member';

  // Update selected emoji and members when opening modals
  useEffect(() => {
      if (editAccount) {
          setSelectedEmoji(editAccount.emoji || '💰');
          const currentAssignees = getAssignees(editAccount.id).map(m => m.id);
          setSelectedMembers(currentAssignees);
      } else if (editPot) {
          setSelectedEmoji(editPot.pot?.emoji || '🎯');
      } else if (isNewAccount) {
          setSelectedEmoji('💰');
          setSelectedMembers([currentUser?.id].filter(Boolean));
      }
  }, [editAccount, editPot, isNewAccount]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [accRes, assRes] = await Promise.all([
          api.get(`/households/${householdId}/finance/savings`),
          api.get(`/households/${householdId}/finance/assignments?entity_type=finance_savings`)
      ]);
      const accs = accRes.data || [];
      setAccounts(accs);
      setAssignments(assRes.data || []);

      // Fetch pots for all accounts
      const potsMap = {};
      await Promise.all(accs.map(async (acc) => {
          try {
              const potRes = await api.get(`/households/${householdId}/finance/savings/${acc.id}/pots`);
              potsMap[acc.id] = potRes.data || [];
          } catch (e) {
              console.error(`Failed to load pots for ${acc.id}`, e);
          }
      }));
      setPots(potsMap);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [api, householdId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- ACCOUNT HANDLERS ---
  const handleAccountSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    try {
      let accountId = editAccount?.id;
      if (isNewAccount) {
        const res = await api.post(`/households/${householdId}/finance/savings`, data);
        accountId = res.data.id;
      } else {
        await api.put(`/households/${householdId}/finance/savings/${accountId}`, data);
      }

      // Handle Assignments
      const currentIds = isNewAccount ? [] : getAssignees(accountId).map(m => m.id);
      const toAdd = selectedMembers.filter(id => !currentIds.includes(id));
      await Promise.all(toAdd.map(mid => api.post(`/households/${householdId}/finance/assignments`, {
          entity_type: 'finance_savings', entity_id: accountId, member_id: mid
      })));

      const toRemove = currentIds.filter(id => !selectedMembers.includes(id));
      await Promise.all(toRemove.map(mid => api.delete(`/households/${householdId}/finance/assignments/finance_savings/${accountId}/${mid}`)));

      fetchData();
      setEditAccount(null);
    } catch (err) { 
        alert("Failed to save account: " + err.message); 
    }
  };

  const handleAccountDelete = async (id) => {
    if (!window.confirm("Delete this savings account?")) return;
    try {
        await api.delete(`/households/${householdId}/finance/savings/${id}`);
        fetchData();
    } catch (err) { alert("Failed to delete"); }
  };

  // --- POT HANDLERS ---
  const handlePotSubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const data = Object.fromEntries(formData.entries());
      const { savingsId, pot } = editPot;

      try {
          if (pot?.id) {
              await api.put(`/households/${householdId}/finance/savings/${savingsId}/pots/${pot.id}`, data);
          } else {
              await api.post(`/households/${householdId}/finance/savings/${savingsId}/pots`, data);
          }
          // Refresh pots only
          const potRes = await api.get(`/households/${householdId}/finance/savings/${savingsId}/pots`);
          setPots(prev => ({ ...prev, [savingsId]: potRes.data }));
          setEditPot(null);
      } catch (err) { alert("Failed to save pot"); }
  };

  const handlePotDelete = async (savingsId, potId) => {
      if (!window.confirm("Delete this pot?")) return;
      try {
          await api.delete(`/households/${householdId}/finance/savings/${savingsId}/pots/${potId}`);
          const potRes = await api.get(`/households/${householdId}/finance/savings/${savingsId}/pots`);
          setPots(prev => ({ ...prev, [savingsId]: potRes.data }));
      } catch (err) { alert("Failed to delete pot"); }
  };

  const handleAdjustSubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const amount = parseFloat(formData.get('amount'));
      if (!amount || amount <= 0) return;

      const { savingsId, pot, type } = adjustPot;
      const newAmount = type === 'add' 
          ? (pot.current_amount || 0) + amount 
          : (pot.current_amount || 0) - amount;

      try {
          await api.put(`/households/${householdId}/finance/savings/${savingsId}/pots/${pot.id}`, {
              ...pot,
              current_amount: newAmount
          });
          
          const potRes = await api.get(`/households/${householdId}/finance/savings/${savingsId}/pots`);
          setPots(prev => ({ ...prev, [savingsId]: potRes.data }));
          setAdjustPot(null);
      } catch (err) { alert("Failed to update balance"); }
  };


  // --- ASSIGNMENT HANDLERS ---
  const handleAssignMember = async (memberId) => {
      try {
          await api.post(`/households/${householdId}/finance/assignments`, {
              entity_type: 'finance_savings',
              entity_id: assignItem.id,
              member_id: memberId
          });
          const assRes = await api.get(`/households/${householdId}/finance/assignments?entity_type=finance_savings`);
          setAssignments(assRes.data || []);
      } catch (err) { 
          console.error(err);
          alert(`Assignment failed: ${err.message}`);
      }
  };

  const handleUnassignMember = async (memberId) => {
      try {
          await api.delete(`/households/${householdId}/finance/assignments/finance_savings/${assignItem.id}/${memberId}`);
          const assRes = await api.get(`/households/${householdId}/finance/assignments?entity_type=finance_savings`);
          setAssignments(assRes.data || []);
      } catch (err) { 
          console.error(err);
          alert(`Removal failed: ${err.message}`);
      }
  };

  const getAssignees = (accountId) => {
      return assignments.filter(a => a.entity_id === accountId).map(a => members.find(m => m.id === a.member_id)).filter(Boolean);
  };


  // --- CALCULATIONS ---
  const calculateForecast = (principal, rate, years = 3) => {
      const p = parseFloat(principal) || 0;
      const r = (parseFloat(rate) || 0) / 100;
      if (p === 0) return [];
      
      let data = [];
      let current = p;
      for (let i = 1; i <= years; i++) {
          current = current * (1 + r); // Annual compounding
          data.push({ year: i, amount: current });
      }
      return data;
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  return (
    <Box>
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
                <Typography level="h2">Savings & Investments</Typography>
                <Typography color="neutral">Track savings goals, pots, and interest.</Typography>
            </Box>
            {isAdmin && (
                <Button startDecorator={<Add />} onClick={() => { setEditAccount({}); setIsNewAccount(true); }}>
                    Add Savings Account
                </Button>
            )}
        </Box>

        <Grid container spacing={3}>
            {accounts.map(acc => {
                const accPots = pots[acc.id] || [];
                const allocated = accPots.reduce((sum, p) => sum + (parseFloat(p.current_amount)||0), 0);
                const unallocated = (parseFloat(acc.current_balance)||0) - allocated;
                const forecast = calculateForecast(acc.current_balance, acc.interest_rate);

                return (
                    <Grid xs={12} lg={6} xl={4} key={acc.id}>
                        <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {/* HEADER */}
                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                <Avatar size="lg" sx={{ bgcolor: getEmojiColor(acc.emoji || '💰', isDark) }}>
                                    {acc.emoji || '💰'}
                                </Avatar>
                                <Box sx={{ flexGrow: 1 }}>
                                    <Typography level="title-lg">{acc.institution}</Typography>
                                    <Typography level="body-sm">{acc.account_name}</Typography>
                                </Box>
                                <Box sx={{ textAlign: 'right' }}>
                                    <Typography level="h3" color="success">£{acc.current_balance?.toLocaleString()}</Typography>
                                    <Typography level="body-xs" color="neutral">{acc.interest_rate}% AER</Typography>
                                </Box>
                            </Box>

                            <Divider />

                            {/* POTS SECTION */}
                            <Box sx={{ flexGrow: 1 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                    <Typography level="title-sm" startDecorator={<Savings fontSize="sm" />}>Pots</Typography>
                                    {unallocated > 0.01 && (
                                        <Button size="sm" variant="soft" color="warning" onClick={() => setEditPot({ savingsId: acc.id, pot: { current_amount: unallocated } })}>
                                            Allocate £{unallocated.toLocaleString()}
                                        </Button>
                                    )}
                                </Box>
                                
                                {accPots.length === 0 && <Typography level="body-xs" color="neutral" sx={{ fontStyle: 'italic' }}>No pots created. Total balance is unallocated.</Typography>}

                                <Stack spacing={1}>
                                    {accPots.map(pot => {
                                        const progress = pot.target_amount ? (pot.current_amount / pot.target_amount) * 100 : 0;
                                        return (
                                            <Card key={pot.id} variant="soft" size="sm" sx={{ p: 1.5 }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                    <Typography level="title-sm">{pot.emoji} {pot.name}</Typography>
                                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                        <IconButton size="sm" variant="outlined" color="danger" onClick={() => setAdjustPot({ savingsId: acc.id, pot, type: 'remove' })}>
                                                            <Remove fontSize="small" />
                                                        </IconButton>
                                                        <IconButton size="sm" variant="outlined" color="success" onClick={() => setAdjustPot({ savingsId: acc.id, pot, type: 'add' })}>
                                                            <Add fontSize="small" />
                                                        </IconButton>
                                                        <IconButton size="sm" onClick={() => setEditPot({ savingsId: acc.id, pot })}> <Edit fontSize="small" /> </IconButton>
                                                        <IconButton size="sm" color="danger" onClick={() => handlePotDelete(acc.id, pot.id)}> <Delete fontSize="small" /> </IconButton>
                                                    </Box>
                                                </Box>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Typography level="body-sm">£{pot.current_amount?.toLocaleString()}</Typography>
                                                    {pot.target_amount && <Typography level="body-xs" color="neutral">of £{pot.target_amount?.toLocaleString()}</Typography>}
                                                </Box>
                                                {pot.target_amount && <LinearProgress determinate value={Math.min(progress, 100)} size="sm" color={progress >= 100 ? 'success' : 'primary'} />}
                                            </Card>
                                        );
                                    })}
                                </Stack>
                            </Box>
                            
                            {/* ACTIONS & ASSIGNEES */}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto', pt: 2 }}>
                                <AvatarGroup size="sm">
                                    {getAssignees(acc.id).map(m => (
                                        <Avatar key={m.id} sx={{ bgcolor: getEmojiColor(m.emoji, isDark) }}>{m.emoji}</Avatar>
                                    ))}
                                    <IconButton size="sm" onClick={() => setAssignItem(acc)} sx={{ borderRadius: '50%' }}><GroupAdd /></IconButton>
                                </AvatarGroup>
                                <Box>
                                    <Button size="sm" variant="plain" onClick={() => setEditPot({ savingsId: acc.id, pot: {} })} startDecorator={<Add />}>Add Pot</Button>
                                    <IconButton size="sm" onClick={() => { setEditAccount(acc); setIsNewAccount(false); }}><Edit /></IconButton>
                                </Box>
                            </Box>

                            {/* FORECAST */}
                            <Accordion variant="outlined" sx={{ borderRadius: 'sm' }}>
                                <AccordionSummary expandIcon={<ExpandMore />}>
                                    <Typography level="title-sm" startDecorator={<TrendingUp />}>Forecast (3 Years)</Typography>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <Table size="sm">
                                        <thead><tr><th>Year</th><th style={{ textAlign: 'right' }}>Projected</th><th style={{ textAlign: 'right' }}>Growth</th></tr></thead>
                                        <tbody>
                                            {forecast.map(f => (
                                                <tr key={f.year}>
                                                    <td>Year {f.year}</td>
                                                    <td style={{ textAlign: 'right' }}>£{f.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                                    <td style={{ textAlign: 'right' }} className="text-success">+£{(f.amount - acc.current_balance).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </AccordionDetails>
                            </Accordion>
                        </Card>
                    </Grid>
                );
            })}
        </Grid>

        {/* --- MODALS --- */}

        {/* ADJUST MODAL */}
        <Modal open={Boolean(adjustPot)} onClose={() => setAdjustPot(null)}>
            <ModalDialog size="sm">
                <DialogTitle>{adjustPot?.type === 'add' ? 'Add Funds' : 'Remove Funds'}</DialogTitle>
                <DialogContent>
                    <form onSubmit={handleAdjustSubmit}>
                        <FormControl required>
                            <FormLabel>Amount (£)</FormLabel>
                            <Input name="amount" type="number" step="0.01" autoFocus />
                        </FormControl>
                        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                            <Button variant="plain" color="neutral" onClick={() => setAdjustPot(null)}>Cancel</Button>
                            <Button type="submit" color={adjustPot?.type === 'add' ? 'success' : 'danger'}>
                                {adjustPot?.type === 'add' ? 'Add' : 'Remove'}
                            </Button>
                        </Box>
                    </form>
                </DialogContent>
            </ModalDialog>
        </Modal>

        {/* ACCOUNT MODAL */}
        <Modal open={Boolean(editAccount)} onClose={() => setEditAccount(null)}>
            <ModalDialog>
                <DialogTitle>{isNewAccount ? 'Add Savings Account' : 'Edit Account'}</DialogTitle>
                <DialogContent>
                    <form onSubmit={handleAccountSubmit}>
                        <Stack spacing={2} sx={{ mt: 1 }}>
                            <FormControl>
                                <FormLabel>Institution</FormLabel>
                                <Input name="institution" required defaultValue={editAccount?.institution} placeholder="e.g. Chase" />
                            </FormControl>
                            <FormControl>
                                <FormLabel>Account Name</FormLabel>
                                <Input name="account_name" required defaultValue={editAccount?.account_name} placeholder="e.g. Saver" />
                            </FormControl>
                            <Grid container spacing={2}>
                                <Grid xs={6}>
                                    <FormControl>
                                        <FormLabel>Balance (£)</FormLabel>
                                        <Input name="current_balance" type="number" step="0.01" defaultValue={editAccount?.current_balance} />
                                    </FormControl>
                                </Grid>
                                <Grid xs={6}>
                                    <FormControl>
                                        <FormLabel>Interest Rate (%)</FormLabel>
                                        <Input name="interest_rate" type="number" step="0.01" defaultValue={editAccount?.interest_rate} />
                                    </FormControl>
                                </Grid>
                            </Grid>
                            <FormControl>
                                <FormLabel>Account Number (Encrypted)</FormLabel>
                                <Input name="account_number" defaultValue={editAccount?.account_number} />
                            </FormControl>
                            <FormControl>
                                <FormLabel>Emoji</FormLabel>
                                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                    <Button 
                                        variant="outlined" 
                                        color="neutral" 
                                        onClick={() => setEmojiPicker({ open: true, type: 'account' })}
                                        sx={{ minWidth: 48, px: 0 }}
                                    >
                                        <Avatar size="sm" sx={{ bgcolor: getEmojiColor(selectedEmoji, isDark) }}>{selectedEmoji}</Avatar>
                                    </Button>
                                    <Input type="hidden" name="emoji" value={selectedEmoji || ''} />
                                    <Typography level="body-xs" color="neutral">Click to change icon</Typography>
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
                                                onClick={() => {
                                                    setSelectedMembers(prev => 
                                                        prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id]
                                                    );
                                                }}
                                                startDecorator={<Avatar size="sm" src={m.avatar}>{m.emoji}</Avatar>}
                                            >
                                                {m.name}
                                            </Chip>
                                        );
                                    })}
                                </Box>
                            </FormControl>
                        </Stack>
                        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            {!isNewAccount && (
                                <Button 
                                    color="danger" 
                                    variant="soft" 
                                    onClick={() => {
                                        handleAccountDelete(editAccount.id);
                                        setEditAccount(null);
                                    }}
                                >
                                    Delete
                                </Button>
                            )}
                            <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
                                <Button variant="plain" color="neutral" onClick={() => setEditAccount(null)}>Cancel</Button>
                                <Button type="submit">Save</Button>
                            </Box>
                        </Box>
                    </form>
                </DialogContent>
            </ModalDialog>
        </Modal>

        {/* POT MODAL */}
        <Modal open={Boolean(editPot)} onClose={() => setEditPot(null)}>
            <ModalDialog>
                <DialogTitle>{editPot?.pot?.id ? 'Edit Pot' : 'Create Pot'}</DialogTitle>
                <DialogContent>
                    <form onSubmit={handlePotSubmit}>
                        <Stack spacing={2} sx={{ mt: 1 }}>
                            <FormControl>
                                <FormLabel>Pot Name</FormLabel>
                                <Input name="name" required defaultValue={editPot?.pot?.name} placeholder="e.g. Holiday Fund" />
                            </FormControl>
                            <Grid container spacing={2}>
                                <Grid xs={6}>
                                    <FormControl>
                                        <FormLabel>Current Amount (£)</FormLabel>
                                        <Input name="current_amount" type="number" step="0.01" defaultValue={editPot?.pot?.current_amount} />
                                    </FormControl>
                                </Grid>
                                <Grid xs={6}>
                                    <FormControl>
                                        <FormLabel>Target Amount (£)</FormLabel>
                                        <Input name="target_amount" type="number" step="0.01" defaultValue={editPot?.pot?.target_amount} />
                                    </FormControl>
                                </Grid>
                            </Grid>
                            <FormControl>
                                <FormLabel>Emoji</FormLabel>
                                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                    <Button 
                                        variant="outlined" 
                                        color="neutral" 
                                        onClick={() => setEmojiPicker({ open: true, type: 'pot' })}
                                        sx={{ minWidth: 48, px: 0 }}
                                    >
                                        <Avatar size="sm" sx={{ bgcolor: getEmojiColor(selectedEmoji, isDark) }}>{selectedEmoji}</Avatar>
                                    </Button>
                                    <Input type="hidden" name="emoji" value={selectedEmoji || ''} />
                                    <Typography level="body-xs" color="neutral">Click to change icon</Typography>
                                </Box>
                            </FormControl>
                        </Stack>
                        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                            <Button variant="plain" color="neutral" onClick={() => setEditPot(null)}>Cancel</Button>
                            <Button type="submit">Save Pot</Button>
                        </Box>
                    </form>
                </DialogContent>
            </ModalDialog>
        </Modal>

        {/* ASSIGNMENT MODAL */}
        <Modal open={Boolean(assignItem)} onClose={() => setAssignItem(null)}>
            <ModalDialog size="sm">
                <DialogTitle>Assign Savers</DialogTitle>
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
            open={emojiPicker.open} 
            onClose={() => setEmojiPicker({ ...emojiPicker, open: false })}
            onEmojiSelect={(emoji) => {
                setSelectedEmoji(emoji);
                setEmojiPicker({ ...emojiPicker, open: false });
            }}
            isDark={isDark}
        />
    </Box>
  );
}