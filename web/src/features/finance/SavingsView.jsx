import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext, useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Button,
  Modal,
  ModalDialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Input,
  FormControl,
  FormLabel,
  Stack,
  Chip,
  CircularProgress,
  Divider,
  Avatar,
  IconButton,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  Card,
  Tooltip,
} from '@mui/joy';
import { Edit, Delete, Add, ExpandMore, Savings, TrendingUp, Remove } from '@mui/icons-material';
import { getEmojiColor } from '../../utils/colors';
import EmojiPicker from '../../components/EmojiPicker';
import ModuleHeader from '../../components/ui/ModuleHeader';
import FinanceCard from '../../components/ui/FinanceCard';
import { triggerConfetti } from '../../utils/fx';

const formatCurrency = (val) => {
  const num = parseFloat(val) || 0;
  return num.toLocaleString('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatPercent = (val) => {
  const num = parseFloat(val) || 0;
  return num.toFixed(2) + '%';
};

export default function SavingsView({ financialProfileId }) {
  const {
    api,
    id: householdId,
    user: currentUser,
    isDark,
    members,
    showNotification,
    confirmAction,
  } = useOutletContext();
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const selectedAccountId = queryParams.get('selectedAccountId');
  const selectedPotId = queryParams.get('selectedPotId');

  const [accounts, setAccounts] = useState([]);
  const [pots, setPots] = useState({}); // Map of savingsId -> [pots]
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [adjustPot, setAdjustPot] = useState(null); // { savingsId, pot, type: 'add'|'remove' }
  const [adjustAccount, setAdjustAccount] = useState(null); // { account, type: 'add'|'remove' }
  const [assignItem, setAssignItem] = useState(null);
  const [emojiPicker, setEmojiPicker] = useState({ open: false, type: null }); // type: 'account' | 'pot'
  const [selectedEmoji, setSelectedEmoji] = useState(null);
  const [selectedMembers, setSelectedMembers] = useState([]);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'member';

  const getAssignees = useCallback(
    (accountId) => {
      return assignments
        .filter((a) => a.entity_id === accountId)
        .map((a) => members.find((m) => m.id === a.member_id))
        .filter(Boolean);
    },
    [assignments, members]
  );

  const selectedAccount = useMemo(
    () => accounts.find((a) => String(a.id) === String(selectedAccountId)),
    [accounts, selectedAccountId]
  );

  const selectedPot = useMemo(() => {
    if (!selectedAccount || !selectedPotId) return null;
    return (pots[selectedAccount.id] || []).find((p) => String(p.id) === String(selectedPotId));
  }, [selectedAccount, pots, selectedPotId]);

  // Update selected emoji and members when opening modals
  useEffect(() => {
    if (selectedAccount) {
      setSelectedEmoji(selectedAccount.emoji || '💰');
      const currentAssignees = getAssignees(selectedAccount.id).map((m) => m.id);
      setSelectedMembers(currentAssignees);
    } else if (selectedPot) {
      setSelectedEmoji(selectedPot.emoji || '🎯');
    } else if (selectedAccountId === 'new') {
      setSelectedEmoji('💰');
      const defaultMember = members.find((m) => m.type !== 'pet');
      setSelectedMembers(defaultMember ? [defaultMember.id] : []);
    } else if (selectedPotId === 'new') {
      setSelectedEmoji('🎯');
    }
  }, [
    selectedAccount,
    selectedPot,
    selectedAccountId,
    selectedPotId,
    getAssignees,
    currentUser?.id,
    members,
  ]);

  const fetchData = useCallback(async () => {
    if (!financialProfileId) return;
    setLoading(true);
    try {
      const [accRes, assRes] = await Promise.all([
        api.get(
          `/households/${householdId}/finance/savings?financial_profile_id=${financialProfileId}`
        ),
        api.get(`/households/${householdId}/finance/assignments?entity_type=finance_savings`),
      ]);
      const accs = accRes.data || [];
      setAccounts(accs);
      setAssignments(assRes.data || []);

      const potsMap = {};
      await Promise.all(
        accs.map(async (acc) => {
          try {
            const potRes = await api.get(
              `/households/${householdId}/finance/savings/${acc.id}/pots`
            );
            potsMap[acc.id] = potRes.data || [];
          } catch (e) {
            console.error(`Failed to load pots for ${acc.id}`, e);
          }
        })
      );
      setPots(potsMap);
    } catch (err) {
      console.error('Failed to fetch savings data', err);
    } finally {
      setLoading(false);
    }
  }, [api, householdId, financialProfileId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    data.emoji = selectedEmoji;
    data.financial_profile_id = financialProfileId;

    try {
      let accountId = selectedAccountId;
      if (selectedAccountId === 'new') {
        const res = await api.post(`/households/${householdId}/finance/savings`, data);
        accountId = res.data.id;
        showNotification('Account added.', 'success');
      } else {
        await api.put(`/households/${householdId}/finance/savings/${accountId}`, data);
        showNotification('Account updated.', 'success');
      }

      const currentIds =
        selectedAccountId === 'new' ? [] : getAssignees(accountId).map((m) => m.id);
      const toAdd = selectedMembers.filter((id) => !currentIds.includes(id));
      await Promise.all(
        toAdd.map((mid) =>
          api.post(`/households/${householdId}/finance/assignments`, {
            entity_type: 'finance_savings',
            entity_id: accountId,
            member_id: mid,
          })
        )
      );
      const toRemove = currentIds.filter((id) => !selectedMembers.includes(id));
      await Promise.all(
        toRemove.map((mid) =>
          api.delete(
            `/households/${householdId}/finance/assignments/finance_savings/${accountId}/${mid}`
          )
        )
      );

      await fetchData();
      setAccountId(null);
    } catch (err) {
      showNotification('Failed to save account: ' + err.message, 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAccountDelete = async (id) => {
    confirmAction(
      'Delete Savings Account',
      'Are you sure you want to delete this account and all its pots? This cannot be undone.',
      async () => {
        try {
          await api.delete(`/households/${householdId}/finance/savings/${id}`);
          showNotification('Account deleted', 'success');
          fetchData();
          if (selectedAccountId === String(id)) setAccountId(null);
        } catch {
          showNotification('Failed to delete account', 'danger');
        }
      }
    );
  };

  const handlePotSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    data.emoji = selectedEmoji;
    const savingsId = selectedAccountId;

    try {
      if (selectedPotId !== 'new') {
        await api.put(
          `/households/${householdId}/finance/savings/${savingsId}/pots/${selectedPotId}`,
          data
        );
      } else {
        await api.post(`/households/${householdId}/finance/savings/${savingsId}/pots`, data);
        showNotification('Pot created.', 'success');
      }

      if (
        parseFloat(data.current_amount) >= parseFloat(data.target_amount) &&
        data.target_amount > 0
      ) {
        triggerConfetti();
      }

      await fetchData();
      setPotId(savingsId, null);
    } catch {
      alert('Failed to save pot');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePotDelete = async (savingsId, potId) => {
    confirmAction('Delete Pot', 'Are you sure you want to delete this pot?', async () => {
      try {
        await api.delete(`/households/${householdId}/finance/savings/${savingsId}/pots/${potId}`);
        showNotification('Pot deleted', 'success');
        await fetchData();
        if (selectedPotId === String(potId)) setPotId(savingsId, null);
      } catch {
        showNotification('Failed to delete pot', 'danger');
      }
    });
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const amount = parseFloat(formData.get('amount'));
    if (!amount || amount <= 0) {
      setSubmitting(false);
      return;
    }
    const { savingsId, pot, type } = adjustPot;
    const newAmount =
      type === 'add' ? (pot.current_amount || 0) + amount : (pot.current_amount || 0) - amount;
    try {
      await api.put(`/households/${householdId}/finance/savings/${savingsId}/pots/${pot.id}`, {
        ...pot,
        current_amount: newAmount,
      });

      if (newAmount >= parseFloat(pot.target_amount) && pot.target_amount > 0) {
        triggerConfetti();
      }

      await fetchData();
      setAdjustPot(null);
    } catch {
      alert('Failed to update balance');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdjustAccountSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const amount = parseFloat(formData.get('amount'));
    if (!amount || amount <= 0) {
      setSubmitting(false);
      return;
    }
    const { account, type } = adjustAccount;
    const newAmount =
      type === 'add'
        ? (parseFloat(account.current_balance) || 0) + amount
        : (parseFloat(account.current_balance) || 0) - amount;
    try {
      await api.put(`/households/${householdId}/finance/savings/${account.id}`, {
        current_balance: newAmount,
      });
      fetchData();
      setAdjustAccount(null);
    } catch {
      alert('Failed to update account balance');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignMember = async (memberId) => {
    try {
      await api.post(`/households/${householdId}/finance/assignments`, {
        entity_type: 'finance_savings',
        entity_id: assignItem.id,
        member_id: memberId,
      });
      const assRes = await api.get(
        `/households/${householdId}/finance/assignments?entity_type=finance_savings`
      );
      setAssignments(assRes.data || []);
    } catch (err) {
      console.error('Assignment failed', err);
    }
  };

  const handleUnassignMember = async (memberId) => {
    try {
      await api.delete(
        `/households/${householdId}/finance/assignments/finance_savings/${assignItem.id}/${memberId}`
      );
      const assRes = await api.get(
        `/households/${householdId}/finance/assignments?entity_type=finance_savings`
      );
      setAssignments(assRes.data || []);
    } catch (err) {
      console.error('Removal failed', err);
    }
  };

  const calculateForecast = (principal, rate, years = 3) => {
    const p = parseFloat(principal) || 0;
    const r = (parseFloat(rate) || 0) / 100;
    if (p === 0) return [];
    let data = [];
    let current = p;
    for (let i = 1; i <= years; i++) {
      current = current * (1 + r);
      data.push({ year: i, amount: current });
    }
    return data;
  };

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );

  return (
    <Box>
      <ModuleHeader
        title="Savings & Pots"
        description="Monitor savings goals and rainy day funds."
        emoji="💰"
        isDark={isDark}
        action={
          isAdmin && (
            <Button
              variant="solid"
              startDecorator={<Add />}
              onClick={() => setAccountId('new')}
              sx={{ height: '44px' }}
            >
              Add Savings Account
            </Button>
          )
        }
      />

      <Grid container spacing={3}>
        {accounts.map((acc) => {
          const accPots = pots[acc.id] || [];
          const allocated = accPots.reduce(
            (sum, p) => sum + (parseFloat(p.current_amount) || 0),
            0
          );
          const unallocated = (parseFloat(acc.current_balance) || 0) - allocated;
          const forecast = calculateForecast(acc.current_balance, acc.interest_rate);

          return (
            <Grid xs={12} lg={6} xl={4} key={acc.id}>
              <FinanceCard
                title={acc.institution}
                subtitle={acc.account_name}
                emoji={acc.emoji || '💰'}
                isDark={isDark}
                balance={acc.current_balance}
                balanceColor="success"
                subValue={
                  <Tooltip
                    title="Annual Equivalent Rate: illustrates what the interest rate would be if interest was paid and compounded once each year."
                    variant="soft"
                  >
                    <Typography level="body-xs" sx={{ cursor: 'help', borderBottom: '1px dotted' }}>
                      {formatPercent(acc.interest_rate)} AER
                    </Typography>
                  </Tooltip>
                }
                assignees={getAssignees(acc.id)}
                onAssign={() => setAssignItem(acc)}
                onEdit={() => setAccountId(acc.id)}
                onDelete={() => handleAccountDelete(acc.id)}
                onAddFunds={() => setAdjustAccount({ account: acc, type: 'add' })}
                onRemoveFunds={() => setAdjustAccount({ account: acc, type: 'remove' })}
                extraActions={
                  <Button
                    size="sm"
                    variant="plain"
                    onClick={() => setPotId(acc.id, 'new')}
                    startDecorator={<Add />}
                  >
                    Add Pot
                  </Button>
                }
              >
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography level="title-sm" startDecorator={<Savings fontSize="sm" />}>
                      Pots
                    </Typography>
                    {unallocated > 0.01 && (
                      <Button
                        size="sm"
                        variant="soft"
                        color="warning"
                        onClick={() => {
                          setAccountId(acc.id);
                          setPotId(acc.id, 'new');
                          setSelectedEmoji('🎯');
                        }}
                      >
                        Allocate {formatCurrency(unallocated)}
                      </Button>
                    )}
                  </Box>
                  {accPots.length === 0 && (
                    <Typography level="body-xs" color="neutral" sx={{ fontStyle: 'italic' }}>
                      No pots created. Total balance is unallocated.
                    </Typography>
                  )}
                  <Stack spacing={1}>
                    {accPots.map((pot) => {
                      const progress = pot.target_amount
                        ? (pot.current_amount / pot.target_amount) * 100
                        : 0;
                      return (
                        <Card key={pot.id} variant="soft" size="sm" sx={{ p: 1.5 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography level="title-sm">
                              {pot.emoji} {pot.name}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <IconButton
                                size="sm"
                                variant="outlined"
                                color="danger"
                                onClick={() =>
                                  setAdjustPot({ savingsId: acc.id, pot, type: 'remove' })
                                }
                              >
                                <Remove fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="sm"
                                variant="outlined"
                                color="success"
                                onClick={() =>
                                  setAdjustPot({ savingsId: acc.id, pot, type: 'add' })
                                }
                              >
                                <Add fontSize="small" />
                              </IconButton>
                              <IconButton size="sm" onClick={() => setPotId(acc.id, pot.id)}>
                                {' '}
                                <Edit fontSize="small" />{' '}
                              </IconButton>
                              <IconButton
                                size="sm"
                                color="danger"
                                onClick={() => handlePotDelete(acc.id, pot.id)}
                              >
                                {' '}
                                <Delete fontSize="small" />{' '}
                              </IconButton>
                            </Box>
                          </Box>
                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <Typography level="body-sm">
                              {formatCurrency(pot.current_amount)}
                            </Typography>
                            {pot.target_amount && (
                              <Typography level="body-xs" color="neutral">
                                of {formatCurrency(pot.target_amount)}
                              </Typography>
                            )}
                          </Box>
                          {pot.target_amount && (
                            <LinearProgress
                              determinate
                              value={Math.min(progress, 100)}
                              size="sm"
                              color={progress >= 100 ? 'success' : 'primary'}
                            />
                          )}
                        </Card>
                      );
                    })}
                  </Stack>
                </Box>

                <Accordion variant="outlined" sx={{ borderRadius: 'sm', mt: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography level="title-sm" startDecorator={<TrendingUp />}>
                      Forecast (3 Years)
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ overflowX: 'auto' }}>
                    <Table size="sm" sx={{ minWidth: 250 }}>
                      <thead>
                        <tr>
                          <th>Year</th>
                          <th style={{ textAlign: 'right' }}>Projected</th>
                          <th style={{ textAlign: 'right' }}>Growth</th>
                        </tr>
                      </thead>
                      <tbody>
                        {forecast.map((f) => (
                          <tr key={f.year}>
                            <td>Year {f.year}</td>
                            <td style={{ textAlign: 'right' }}>{formatCurrency(f.amount)}</td>
                            <td style={{ textAlign: 'right' }}>
                              +{formatCurrency(f.amount - acc.current_balance)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </AccordionDetails>
                </Accordion>
              </FinanceCard>
            </Grid>
          );
        })}
      </Grid>

      <Modal open={Boolean(adjustPot)} onClose={() => setAdjustPot(null)}>
        <ModalDialog size="sm">
          <DialogTitle>
            {adjustPot?.type === 'add' ? 'Add Funds to Pot' : 'Remove Funds from Pot'}
          </DialogTitle>
          <DialogContent>
            <form onSubmit={handleAdjustSubmit}>
              <FormControl required>
                <FormLabel>Amount (£)</FormLabel>
                <Input
                  name="amount"
                  type="number"
                  step="0.01"
                  autoFocus
                  slotProps={{ input: { inputMode: 'decimal' } }}
                />
              </FormControl>
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Button variant="plain" color="neutral" onClick={() => setAdjustPot(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  color={adjustPot?.type === 'add' ? 'success' : 'danger'}
                  loading={submitting}
                >
                  {adjustPot?.type === 'add' ? 'Add' : 'Remove'}
                </Button>
              </Box>
            </form>
          </DialogContent>
        </ModalDialog>
      </Modal>
      <Modal open={Boolean(adjustAccount)} onClose={() => setAdjustAccount(null)}>
        <ModalDialog size="sm">
          <DialogTitle>
            {adjustAccount?.type === 'add' ? 'Add Funds to Account' : 'Remove Funds from Account'}
          </DialogTitle>
          <DialogContent>
            <form onSubmit={handleAdjustAccountSubmit}>
              <FormControl required>
                <FormLabel>Amount (£)</FormLabel>
                <Input
                  name="amount"
                  type="number"
                  step="0.01"
                  autoFocus
                  slotProps={{ input: { inputMode: 'decimal' } }}
                />
              </FormControl>
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Button variant="plain" color="neutral" onClick={() => setAdjustAccount(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  color={adjustAccount?.type === 'add' ? 'success' : 'danger'}
                  loading={submitting}
                >
                  {adjustAccount?.type === 'add' ? 'Add' : 'Remove'}
                </Button>
              </Box>
            </form>
          </DialogContent>
        </ModalDialog>
      </Modal>

      <Modal open={Boolean(selectedAccountId && !selectedPotId)} onClose={() => setAccountId(null)}>
        <ModalDialog sx={{ width: '100%', maxWidth: 500, maxHeight: '95vh', overflowY: 'auto' }}>
          <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'flex-start' }}>
            <Box sx={{ position: 'relative' }}>
              <Avatar
                size="lg"
                sx={{
                  '--Avatar-size': '64px',
                  bgcolor: getEmojiColor(selectedEmoji, isDark),
                  fontSize: '2rem',
                  cursor: 'pointer',
                }}
                onClick={() => setEmojiPicker({ open: true, type: 'account' })}
              >
                {selectedEmoji}
              </Avatar>
              <IconButton
                size="sm"
                variant="solid"
                color="primary"
                sx={{
                  position: 'absolute',
                  bottom: -4,
                  right: -4,
                  borderRadius: '50%',
                  border: '2px solid',
                  borderColor: 'background.surface',
                }}
                onClick={() => setEmojiPicker({ open: true, type: 'account' })}
              >
                <Edit sx={{ fontSize: '0.8rem' }} />
              </IconButton>
            </Box>
            <Box sx={{ flexGrow: 1 }}>
              <DialogTitle>
                {selectedAccountId === 'new' ? 'Add Savings Account' : 'Edit Account'}
              </DialogTitle>
              <Typography level="body-sm" color="neutral">
                Monitor savings goals and rainy day funds.
              </Typography>
            </Box>
          </Box>
          <DialogContent>
            <form onSubmit={handleAccountSubmit}>
              <Stack spacing={2} sx={{ mt: 1 }}>
                <FormControl required>
                  <FormLabel>Institution</FormLabel>
                  <Input
                    name="institution"
                    defaultValue={selectedAccount?.institution}
                    placeholder="e.g. Chase"
                  />
                </FormControl>
                <FormControl required>
                  <FormLabel>Account Name</FormLabel>
                  <Input
                    name="account_name"
                    defaultValue={selectedAccount?.account_name}
                    placeholder="e.g. Saver"
                  />
                </FormControl>
                <Grid container spacing={2}>
                  <Grid xs={12} sm={6}>
                    <FormControl required>
                      <FormLabel>Current Balance (£)</FormLabel>
                      <Input
                        name="current_balance"
                        type="number"
                        slotProps={{ input: { step: 'any', inputMode: 'decimal' } }}
                        defaultValue={selectedAccount?.current_balance}
                      />
                    </FormControl>
                  </Grid>
                  <Grid xs={12} sm={6}>
                    <FormControl>
                      <FormLabel>Interest Rate (%)</FormLabel>
                      <Input
                        name="interest_rate"
                        type="number"
                        slotProps={{ input: { step: 'any', inputMode: 'decimal' } }}
                        defaultValue={selectedAccount?.interest_rate}
                      />
                    </FormControl>
                  </Grid>
                  <Grid xs={12} sm={6}>
                    <FormControl>
                      <FormLabel>Monthly Deposit (£)</FormLabel>
                      <Input
                        name="deposit_amount"
                        type="number"
                        slotProps={{ input: { step: 'any', inputMode: 'decimal' } }}
                        defaultValue={selectedAccount?.deposit_amount}
                      />
                    </FormControl>
                  </Grid>
                  <Grid xs={12} sm={6}>
                    <FormControl>
                      <FormLabel>Deposit Day</FormLabel>
                      <Input
                        name="deposit_day"
                        type="number"
                        min="1"
                        max="31"
                        slotProps={{ input: { inputMode: 'numeric' } }}
                        defaultValue={selectedAccount?.deposit_day}
                        placeholder="e.g. 1"
                      />
                    </FormControl>
                  </Grid>
                </Grid>
                <FormControl>
                  <FormLabel>Account Number (Encrypted)</FormLabel>
                  <Input name="account_number" defaultValue={selectedAccount?.account_number} />
                </FormControl>

                <FormControl>
                  <FormLabel>Assign Owners</FormLabel>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {members
                      .filter((m) => m.type !== 'pet')
                      .map((m) => {
                        const isSelected = selectedMembers.includes(m.id);
                        return (
                          <Chip
                            key={m.id}
                            variant={isSelected ? 'solid' : 'outlined'}
                            color={isSelected ? 'primary' : 'neutral'}
                            onClick={() =>
                              setSelectedMembers((prev) =>
                                prev.includes(m.id)
                                  ? prev.filter((id) => id !== m.id)
                                  : [...prev, m.id]
                              )
                            }
                            startDecorator={<Avatar size="sm">{m.emoji}</Avatar>}
                          >
                            {m.name}
                          </Chip>
                        );
                      })}
                  </Box>
                </FormControl>
              </Stack>
              <Box
                sx={{
                  mt: 3,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                {selectedAccountId !== 'new' && (
                  <Button
                    color="danger"
                    variant="soft"
                    onClick={() => {
                      handleAccountDelete(selectedAccount.id);
                    }}
                  >
                    Delete
                  </Button>
                )}
                <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
                  <Button variant="plain" color="neutral" onClick={() => setAccountId(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" color="primary" loading={submitting}>
                    Save Account
                  </Button>
                </Box>
              </Box>
            </form>
          </DialogContent>
        </ModalDialog>
      </Modal>

      <Modal open={Boolean(selectedPotId)} onClose={() => setPotId(selectedAccountId, null)}>
        <ModalDialog sx={{ width: '100%', maxWidth: 450, maxHeight: '95vh', overflowY: 'auto' }}>
          <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'flex-start' }}>
            <Box sx={{ position: 'relative' }}>
              <Avatar
                size="lg"
                sx={{
                  '--Avatar-size': '64px',
                  bgcolor: getEmojiColor(selectedEmoji, isDark),
                  fontSize: '2rem',
                  cursor: 'pointer',
                }}
                onClick={() => setEmojiPicker({ open: true, type: 'pot' })}
              >
                {selectedEmoji}
              </Avatar>
              <IconButton
                size="sm"
                variant="solid"
                color="primary"
                sx={{
                  position: 'absolute',
                  bottom: -4,
                  right: -4,
                  borderRadius: '50%',
                  border: '2px solid',
                  borderColor: 'background.surface',
                }}
                onClick={() => setEmojiPicker({ open: true, type: 'pot' })}
              >
                <Edit sx={{ fontSize: '0.8rem' }} />
              </IconButton>
            </Box>
            <Box sx={{ flexGrow: 1 }}>
              <DialogTitle>{selectedPotId === 'new' ? 'Create Pot' : 'Edit Pot'}</DialogTitle>
              <Typography level="body-sm" color="neutral">
                Allocate funds from your {selectedAccount?.institution} account to specific goals.
              </Typography>
            </Box>
          </Box>
          <DialogContent>
            <form onSubmit={handlePotSubmit}>
              <Stack spacing={2}>
                <FormControl required>
                  <FormLabel>Pot Name</FormLabel>
                  <Input
                    name="name"
                    defaultValue={selectedPot?.name}
                    placeholder="e.g. Holiday Fund"
                    autoFocus
                  />
                </FormControl>
                <Grid container spacing={2}>
                  <Grid xs={12} sm={6}>
                    <FormControl required>
                      <FormLabel>Current Amount (£)</FormLabel>
                      <Input
                        name="current_amount"
                        type="number"
                        slotProps={{ input: { step: 'any', inputMode: 'decimal' } }}
                        defaultValue={selectedPot?.current_amount}
                      />
                    </FormControl>
                  </Grid>
                  <Grid xs={12} sm={6}>
                    <FormControl>
                      <FormLabel>Target Amount (£)</FormLabel>
                      <Input
                        name="target_amount"
                        type="number"
                        slotProps={{ input: { step: 'any', inputMode: 'decimal' } }}
                        defaultValue={selectedPot?.target_amount}
                      />
                    </FormControl>
                  </Grid>
                </Grid>
                <Input type="hidden" name="emoji" value={selectedEmoji || ''} />
              </Stack>
              <Box
                sx={{
                  mt: 3,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                {selectedPotId !== 'new' && (
                  <Button
                    color="danger"
                    variant="soft"
                    onClick={() => handlePotDelete(selectedAccountId, selectedPotId)}
                  >
                    Delete
                  </Button>
                )}
                <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
                  <Button
                    variant="plain"
                    color="neutral"
                    onClick={() => setPotId(selectedAccountId, null)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" color="primary" loading={submitting}>
                    Save Pot Details
                  </Button>
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
              {members
                .filter((m) => m.type !== 'pet')
                .map((m) => {
                  const isAssigned = getAssignees(assignItem?.id).some((a) => a.id === m.id);
                  return (
                    <Box
                      key={m.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 'sm',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar size="sm" sx={{ bgcolor: getEmojiColor(m.emoji, isDark) }}>
                          {m.emoji}
                        </Avatar>
                        <Typography>{m.name}</Typography>
                      </Box>
                      {isAssigned ? (
                        <Button
                          size="sm"
                          color="danger"
                          variant="soft"
                          onClick={() => handleUnassignMember(m.id)}
                        >
                          Remove
                        </Button>
                      ) : (
                        <Button size="sm" variant="soft" onClick={() => handleAssignMember(m.id)}>
                          Assign
                        </Button>
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
