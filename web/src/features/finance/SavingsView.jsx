import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext, useLocation, useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Grid, Card, Avatar, IconButton, 
  Button, Modal, ModalDialog, DialogTitle, DialogContent, Input,
  FormControl, FormLabel, Stack, Chip, CircularProgress, Divider,
  AvatarGroup, LinearProgress, Accordion, AccordionSummary, AccordionDetails, Table, Checkbox, DialogActions
} from '@mui/joy';
import { Edit, Delete, Add, GroupAdd, ExpandMore, Savings, TrendingUp, Remove } from '@mui/icons-material';
import { getEmojiColor } from '../../theme';
import EmojiPicker from '../../components/EmojiPicker';
import AppSelect from '../../components/ui/AppSelect';

const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return num.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatPercent = (val) => {
    const num = parseFloat(val) || 0;
    return num.toFixed(2) + '%';
};

export default function SavingsView() {
  const { api, id: householdId, user: currentUser, isDark, members, showNotification } = useOutletContext();
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const selectedAccountId = queryParams.get('selectedAccountId');
  const selectedPotId = queryParams.get('selectedPotId');

  const [accounts, setAccounts] = useState([]);
  const [pots, setPots] = useState({}); // Map of savingsId -> [pots]
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [adjustPot, setAdjustPot] = useState(null); // { savingsId, pot, type: 'add'|'remove' }
  const [adjustAccount, setAdjustAccount] = useState(null); // { account, type: 'add'|'remove' }
  const [assignItem, setAssignItem] = useState(null);
  const [emojiPicker, setEmojiPicker] = useState({ open: false, type: null }); // type: 'account' | 'pot'
  const [selectedEmoji, setSelectedEmoji] = useState(null);
  const [selectedMembers, setSelectedMembers] = useState([]);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'member';

  const getAssignees = useCallback((accountId) => {
      return assignments.filter(a => a.entity_id === accountId).map(a => members.find(m => m.id === a.member_id)).filter(Boolean);
  }, [assignments, members]);

  const selectedAccount = useMemo(() => 
    accounts.find(a => String(a.id) === String(selectedAccountId)),
  [accounts, selectedAccountId]);

  const selectedPot = useMemo(() => {
    if (!selectedAccount || !selectedPotId) return null;
    return (pots[selectedAccount.id] || []).find(p => String(p.id) === String(selectedPotId));
  }, [selectedAccount, pots, selectedPotId]);

  // Update selected emoji and members when opening modals
  useEffect(() => {
      if (selectedAccount) {
          setSelectedEmoji(selectedAccount.emoji || '💰');
          const currentAssignees = getAssignees(selectedAccount.id).map(m => m.id);
          setSelectedMembers(currentAssignees);
      } else if (selectedPot) {
          setSelectedEmoji(selectedPot.emoji || '🎯');
      } else if (selectedAccountId === 'new') {
          setSelectedEmoji('💰');
          setSelectedMembers([currentUser?.id].filter(Boolean));
      } else if (selectedPotId === 'new') {
          setSelectedEmoji('🎯');
      }
  }, [selectedAccount, selectedPot, selectedAccountId, selectedPotId, getAssignees, currentUser?.id]);

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

      const potsMap = {};
      await Promise.all(accs.map(async (acc) => {
          try {
              const potRes = await api.get(`/households/${householdId}/finance/savings/${acc.id}/pots`);
              potsMap[acc.id] = potRes.data || [];
          } catch (e) { console.error(`Failed to load pots for ${acc.id}`, e); }
      }));
      setPots(potsMap);
    } catch (err) { console.error("Failed to fetch savings data", err); } finally { setLoading(false); }
  }, [api, householdId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const setAccountId = (id) => {
    const newParams = new URLSearchParams(location.search);
    if (id) newParams.set('selectedAccountId', id);
    else newParams.delete('selectedAccountId');
    newParams.delete('selectedPotId');
    navigate(`?${newParams.toString()}`, { replace: true });
  };

  const setPotId = (accId, pId) => {
    const newParams = new URLSearchParams(location.search);
    if (accId) newParams.set('selectedAccountId', accId);
    if (pId) newParams.set('selectedPotId', pId);
    else newParams.delete('selectedPotId');
    navigate(`?${newParams.toString()}`, { replace: true });
  };

  const handleAccountSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    data.emoji = selectedEmoji;
    
    try {
      let accountId = selectedAccountId;
      if (selectedAccountId === 'new') {
        const res = await api.post(`/households/${householdId}/finance/savings`, data);
        accountId = res.data.id;
        showNotification("Account added.", "success");
      } else {
        await api.put(`/households/${householdId}/finance/savings/${accountId}`, data);
        showNotification("Account updated.", "success");
      }

      const currentIds = selectedAccountId === 'new' ? [] : getAssignees(accountId).map(m => m.id);
      const toAdd = selectedMembers.filter(id => !currentIds.includes(id));
      await Promise.all(toAdd.map(mid => api.post(`/households/${householdId}/finance/assignments`, {
          entity_type: 'finance_savings', entity_id: accountId, member_id: mid
      })));
      const toRemove = currentIds.filter(id => !selectedMembers.includes(id));
      await Promise.all(toRemove.map(mid => api.delete(`/households/${householdId}/finance/assignments/finance_savings/${accountId}/${mid}`)));

      await fetchData();
      setAccountId(accountId);
    } catch (err) { showNotification("Failed to save account: " + err.message, "danger"); }
  };

  const handleAccountDelete = async (id) => {
    if (!window.confirm("Delete this savings account?")) return;
    try {
        await api.delete(`/households/${householdId}/finance/savings/${id}`);
        fetchData();
        if (selectedAccountId === String(id)) setAccountId(null);
    } catch { alert("Failed to delete account"); }
  };

  const handlePotSubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const data = Object.fromEntries(formData.entries());
      data.emoji = selectedEmoji;
      const savingsId = selectedAccountId;

      try {
          if (selectedPotId !== 'new') {
              await api.put(`/households/${householdId}/finance/savings/${savingsId}/pots/${selectedPotId}`, data);
          } else {
              const res = await api.post(`/households/${householdId}/finance/savings/${savingsId}/pots`, data);
              showNotification("Pot created.", "success");
          }
          await fetchData();
          setPotId(savingsId, null);
      } catch { alert("Failed to save pot"); }
  };

  const handlePotDelete = async (savingsId, potId) => {
      if (!window.confirm("Delete this pot?")) return;
      try {
          await api.delete(`/households/${householdId}/finance/savings/${savingsId}/pots/${potId}`);
          await fetchData();
          if (selectedPotId === String(potId)) setPotId(savingsId, null);
      } catch { alert("Failed to delete pot"); }
  };

  const handleAdjustSubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const amount = parseFloat(formData.get('amount'));
      if (!amount || amount <= 0) return;
      const { savingsId, pot, type } = adjustPot;
      const newAmount = type === 'add' ? (pot.current_amount || 0) + amount : (pot.current_amount || 0) - amount;
      try {
          await api.put(`/households/${householdId}/finance/savings/${savingsId}/pots/${pot.id}`, { ...pot, current_amount: newAmount });
          await fetchData();
          setAdjustPot(null);
      } catch { alert("Failed to update balance"); }
  };

  const handleAdjustAccountSubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const amount = parseFloat(formData.get('amount'));
      if (!amount || amount <= 0) return;
      const { account, type } = adjustAccount;
      const newAmount = type === 'add' ? (parseFloat(account.current_balance) || 0) + amount : (parseFloat(account.current_balance) || 0) - amount;
      try {
          await api.put(`/households/${householdId}/finance/savings/${account.id}`, { current_balance: newAmount });
          fetchData();
          setAdjustAccount(null);
      } catch { alert("Failed to update account balance"); }
  };

  const handleAssignMember = async (memberId) => {
      try {
          await api.post(`/households/${householdId}/finance/assignments`, { entity_type: 'finance_savings', entity_id: assignItem.id, member_id: memberId });
          const assRes = await api.get(`/households/${householdId}/finance/assignments?entity_type=finance_savings`);
          setAssignments(assRes.data || []);
      } catch (err) { console.error("Assignment failed", err); }
  };

  const handleUnassignMember = async (memberId) => {
      try {
          await api.delete(`/households/${householdId}/finance/assignments/finance_savings/${assignItem.id}/${memberId}`);
          const assRes = await api.get(`/households/${householdId}/finance/assignments?entity_type=finance_savings`);
          setAssignments(assRes.data || []);
      } catch (err) { console.error("Removal failed", err); }
  };

  const calculateForecast = (principal, rate, years = 3) => {
      const p = parseFloat(principal) || 0;
      const r = (parseFloat(rate) || 0) / 100;
      if (p === 0) return [];
      let data = [];
      let current = p;
      for (let i = 1; i <= years; i++) { current = current * (1 + r); data.push({ year: i, amount: current }); }
      return data;
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  return (
    <Box>
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box>
                <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>Savings</Typography>
                <Typography level="body-md" color="neutral">Monitor savings goals and rainy day funds.</Typography>
            </Box>
            {isAdmin && (
                <Button startDecorator={<Add />} onClick={() => setAccountId('new')}>
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
                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                <Avatar size="lg" sx={{ bgcolor: getEmojiColor(acc.emoji || '💰', isDark) }}>{acc.emoji || '💰'}</Avatar>
                                <Box sx={{ flexGrow: 1 }}>
                                    <Typography level="title-lg">{acc.institution}</Typography>
                                    <Typography level="body-sm">{acc.account_name}</Typography>
                                </Box>
                                <Box sx={{ textAlign: 'right' }}>
                                    <Typography level="h3" color="success">{formatCurrency(acc.current_balance)}</Typography>
                                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end', mb: 0.5 }}>
                                        <IconButton size="sm" variant="soft" color="danger" onClick={() => setAdjustAccount({ account: acc, type: 'remove' })}><Remove fontSize="small" /></IconButton>
                                        <IconButton size="sm" variant="soft" color="success" onClick={() => setAdjustAccount({ account: acc, type: 'add' })}><Add fontSize="small" /></IconButton>
                                    </Box>
                                    <Typography level="body-xs" color="neutral">{formatPercent(acc.interest_rate)} AER</Typography>
                                </Box>
                            </Box>
                            <Divider />
                            <Box sx={{ flexGrow: 1 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                    <Typography level="title-sm" startDecorator={<Savings fontSize="sm" />}>Pots</Typography>
                                    {unallocated > 0.01 && (
                                        <Button size="sm" variant="soft" color="warning" onClick={() => { setAccountId(acc.id); setPotId(acc.id, 'new'); setSelectedEmoji('🎯'); }}>Allocate {formatCurrency(unallocated)}</Button>
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
                                                        <IconButton size="sm" variant="outlined" color="danger" onClick={() => setAdjustPot({ savingsId: acc.id, pot, type: 'remove' })}><Remove fontSize="small" /></IconButton>
                                                        <IconButton size="sm" variant="outlined" color="success" onClick={() => setAdjustPot({ savingsId: acc.id, pot, type: 'add' })}><Add fontSize="small" /></IconButton>
                                                        <IconButton size="sm" onClick={() => setPotId(acc.id, pot.id)}> <Edit fontSize="small" /> </IconButton>
                                                        <IconButton size="sm" color="danger" onClick={() => handlePotDelete(acc.id, pot.id)}> <Delete fontSize="small" /> </IconButton>
                                                    </Box>
                                                </Box>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Typography level="body-sm">{formatCurrency(pot.current_amount)}</Typography>
                                                    {pot.target_amount && <Typography level="body-xs" color="neutral">of {formatCurrency(pot.target_amount)}</Typography>}
                                                </Box>
                                                {pot.target_amount && <LinearProgress determinate value={Math.min(progress, 100)} size="sm" color={progress >= 100 ? 'success' : 'primary'} />}
                                            </Card>
                                        );
                                    })}
                                </Stack>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto', pt: 2 }}>
                                <AvatarGroup size="sm">{getAssignees(acc.id).map(m => (<Avatar key={m.id} sx={{ bgcolor: getEmojiColor(m.emoji, isDark) }}>{m.emoji}</Avatar>))}<IconButton size="sm" onClick={() => setAssignItem(acc)} sx={{ borderRadius: '50%' }}><GroupAdd /></IconButton></AvatarGroup>
                                <Box><Button size="sm" variant="plain" onClick={() => setPotId(acc.id, 'new')} startDecorator={<Add />}>Add Pot</Button><IconButton size="sm" onClick={() => setAccountId(acc.id)}><Edit /></IconButton></Box>
                            </Box>
                            <Accordion variant="outlined" sx={{ borderRadius: 'sm' }}>
                                <AccordionSummary expandIcon={<ExpandMore />}><Typography level="title-sm" startDecorator={<TrendingUp />}>Forecast (3 Years)</Typography></AccordionSummary>
                                <AccordionDetails sx={{ overflowX: 'auto' }}><Table size="sm" sx={{ minWidth: 250 }}><thead><tr><th>Year</th><th style={{ textAlign: 'right' }}>Projected</th><th style={{ textAlign: 'right' }}>Growth</th></tr></thead><tbody>{forecast.map(f => (<tr key={f.year}><td>Year {f.year}</td><td style={{ textAlign: 'right' }}>{formatCurrency(f.amount)}</td><td style={{ textAlign: 'right' }}>+{formatCurrency(f.amount - acc.current_balance)}</td></tr>))}</tbody></Table></AccordionDetails>
                            </Accordion>
                        </Card>
                    </Grid>
                );
            })}
        </Grid>

        <Modal open={Boolean(adjustPot)} onClose={() => setAdjustPot(null)}><ModalDialog size="sm"><DialogTitle>{adjustPot?.type === 'add' ? 'Add Funds to Pot' : 'Remove Funds from Pot'}</DialogTitle><DialogContent><form onSubmit={handleAdjustSubmit}><FormControl required><FormLabel>Amount (£)</FormLabel><Input name="amount" type="number" step="0.01" autoFocus /></FormControl><Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}><Button variant="plain" color="neutral" onClick={() => setAdjustPot(null)}>Cancel</Button><Button type="submit" color={adjustPot?.type === 'add' ? 'success' : 'danger'}>{adjustPot?.type === 'add' ? 'Add' : 'Remove'}</Button></Box></form></DialogContent></ModalDialog></Modal>
        <Modal open={Boolean(adjustAccount)} onClose={() => setAdjustAccount(null)}><ModalDialog size="sm"><DialogTitle>{adjustAccount?.type === 'add' ? 'Add Funds to Account' : 'Remove Funds from Account'}</DialogTitle><DialogContent><form onSubmit={handleAdjustAccountSubmit}><FormControl required><FormLabel>Amount (£)</FormLabel><Input name="amount" type="number" step="0.01" autoFocus /></FormControl><Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}><Button variant="plain" color="neutral" onClick={() => setAdjustAccount(null)}>Cancel</Button><Button type="submit" color={adjustAccount?.type === 'add' ? 'success' : 'danger'}>{adjustAccount?.type === 'add' ? 'Add' : 'Remove'}</Button></Box></form></DialogContent></ModalDialog></Modal>

        <Modal open={Boolean(selectedAccountId && !selectedPotId)} onClose={() => setAccountId(null)}>
            <ModalDialog sx={{ width: '100%', maxWidth: 500, maxHeight: '95vh', overflowY: 'auto' }}>
                <DialogTitle>{selectedAccountId === 'new' ? 'Add Savings Account' : 'Edit Account'}</DialogTitle>
                <DialogContent>
                    <form onSubmit={handleAccountSubmit}>
                        <Stack spacing={2} sx={{ mt: 1 }}>
                            <FormControl required><FormLabel>Institution</FormLabel><Input name="institution" defaultValue={selectedAccount?.institution} placeholder="e.g. Chase" /></FormControl>
                            <FormControl required><FormLabel>Account Name</FormLabel><Input name="account_name" defaultValue={selectedAccount?.account_name} placeholder="e.g. Saver" /></FormControl>
                            <Grid container spacing={2}>
                                <Grid xs={12} sm={6}><FormControl required><FormLabel>Current Balance (£)</FormLabel><Input name="current_balance" type="number" step="any" defaultValue={selectedAccount?.current_balance} /></FormControl></Grid>
                                <Grid xs={12} sm={6}><FormControl><FormLabel>Interest Rate (%)</FormLabel><Input name="interest_rate" type="number" step="any" defaultValue={selectedAccount?.interest_rate} /></FormControl></Grid>
                                <Grid xs={12} sm={6}><FormControl><FormLabel>Monthly Deposit (£)</FormLabel><Input name="deposit_amount" type="number" step="any" defaultValue={selectedAccount?.deposit_amount} /></FormControl></Grid>
                                <Grid xs={12} sm={6}><FormControl><FormLabel>Deposit Day</FormLabel><Input name="deposit_day" type="number" min="1" max="31" defaultValue={selectedAccount?.deposit_day} placeholder="e.g. 1" /></FormControl></Grid>
                            </Grid>
                            <FormControl><FormLabel>Account Number (Encrypted)</FormLabel><Input name="account_number" defaultValue={selectedAccount?.account_number} /></FormControl>
                            <FormControl><FormLabel>Emoji</FormLabel><Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}><Button variant="outlined" color="neutral" onClick={() => setEmojiPicker({ open: true, type: 'account' })} sx={{ minWidth: 48, px: 0 }}><Avatar size="sm" sx={{ bgcolor: getEmojiColor(selectedEmoji, isDark) }}>{selectedEmoji}</Avatar></Button><input type="hidden" name="emoji" value={selectedEmoji || ''} /><Typography level="body-xs" color="neutral">Click icon to change</Typography></Box></FormControl>
                            <FormControl><FormLabel>Assign Owners</FormLabel><Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>{members.filter(m => m.type !== 'pet').map(m => { const isSelected = selectedMembers.includes(m.id); return <Chip key={m.id} variant={isSelected ? 'solid' : 'outlined'} color={isSelected ? 'primary' : 'neutral'} onClick={() => setSelectedMembers(prev => prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id])} startDecorator={<Avatar size="sm">{m.emoji}</Avatar>}>{m.name}</Chip> })}</Box></FormControl>
                        </Stack>
                        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>{!isNewAccount && (<Button color="danger" variant="soft" onClick={() => { handleAccountDelete(selectedAccount.id); }}>Delete</Button>)}<Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}><Button variant="plain" color="neutral" onClick={() => setAccountId(null)}>Cancel</Button><Button type="submit" color="primary">Save Account</Button></Box></Box>
                    </form>
                </DialogContent>
            </ModalDialog>
        </Modal>

        <Modal open={Boolean(selectedPotId)} onClose={() => setPotId(selectedAccountId, null)}>
            <ModalDialog sx={{ width: '100%', maxWidth: 400 }}>
                <DialogTitle>{selectedPotId === 'new' ? 'Create Pot' : 'Edit Pot'}</DialogTitle>
                <DialogContent>
                    <form onSubmit={handlePotSubmit}>
                        <Stack spacing={2} sx={{ mt: 1 }}>
                            <FormControl required><FormLabel>Pot Name</FormLabel><Input name="name" defaultValue={selectedPot?.name} placeholder="e.g. Holiday Fund" /></FormControl>
                            <Grid container spacing={2}>
                                <Grid xs={12} sm={6}><FormControl required><FormLabel>Current Amount (£)</FormLabel><Input name="current_amount" type="number" step="0.01" defaultValue={selectedPot?.current_amount} /></FormControl></Grid>
                                <Grid xs={12} sm={6}><FormControl><FormLabel>Target Amount (£)</FormLabel><Input name="target_amount" type="number" step="0.01" defaultValue={selectedPot?.target_amount} /></FormControl></Grid>
                            </Grid>
                            <FormControl><FormLabel>Emoji</FormLabel><Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}><Button variant="outlined" color="neutral" onClick={() => setEmojiPicker({ open: true, type: 'pot' })} sx={{ minWidth: 48, px: 0 }}><Avatar size="sm" sx={{ bgcolor: getEmojiColor(selectedEmoji, isDark) }}>{selectedEmoji}</Avatar></Button><Input type="hidden" name="emoji" value={selectedEmoji || ''} /></Box></FormControl>
                        </Stack>
                        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1 }}><Button variant="plain" color="neutral" onClick={() => setPotId(selectedAccountId, null)}>Cancel</Button><Button type="submit" color="primary">Save Pot</Button></Box>
                    </form>
                </DialogContent>
            </ModalDialog>
        </Modal>

        <Modal open={Boolean(assignItem)} onClose={() => setAssignItem(null)}><ModalDialog size="sm"><DialogTitle>Assign Owners</DialogTitle><DialogContent><Stack spacing={1}>{members.filter(m => m.type !== 'pet').map(m => { const isAssigned = getAssignees(assignItem?.id).some(a => a.id === m.id); return (<Box key={m.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 'sm' }}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Avatar size="sm" sx={{ bgcolor: getEmojiColor(m.emoji, isDark) }}>{m.emoji}</Avatar><Typography>{m.name}</Typography></Box>{isAssigned ? (<Button size="sm" color="danger" variant="soft" onClick={() => handleUnassignMember(m.id)}>Remove</Button>) : (<Button size="sm" variant="soft" onClick={() => handleAssignMember(m.id)}>Assign</Button>)}</Box>); })}</Stack></DialogContent><DialogActions><Button onClick={() => setAssignItem(null)}>Done</Button></DialogActions></ModalDialog></Modal>

        <EmojiPicker open={emojiPicker.open} onClose={() => setEmojiPicker({ ...emojiPicker, open: false })} onEmojiSelect={(emoji) => { setSelectedEmoji(emoji); setEmojiPicker({ ...emojiPicker, open: false }); }} isDark={isDark} />
    </Box>
  );
}