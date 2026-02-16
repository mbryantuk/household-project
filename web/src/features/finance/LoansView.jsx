import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext, useLocation, useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Button, Divider, IconButton, 
  Modal, ModalDialog, ModalClose, FormControl, FormLabel, Input, 
  Stack, Avatar, Checkbox, Grid, Chip
} from '@mui/joy';
import { Add, Edit } from '@mui/icons-material';
import { getEmojiColor } from '../../theme';
import EmojiPicker from '../../components/EmojiPicker';
import ModuleHeader from '../../components/ui/ModuleHeader';
import FinanceCard from '../../components/ui/FinanceCard';

const formatCurrency = (val, currencyCode = 'GBP') => {
    const num = parseFloat(val) || 0;
    let code = currencyCode === '£' ? 'GBP' : (currencyCode === '$' ? 'USD' : (currencyCode || 'GBP'));
    try {
        return num.toLocaleString('en-GB', { style: 'currency', currency: code, minimumFractionDigits: 2 });
    } catch { return `£${num.toFixed(2)}`; }
};

export default function LoansView({ financialProfileId }) {
  const { api, id: householdId, user: currentUser, household, showNotification, confirmAction, isDark, members } = useOutletContext();
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const selectedLoanId = queryParams.get('selectedLoanId');

  const [loans, setLoans] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState([]);

  const [formData, setFormData] = useState({
    lender: '', 
    loan_type: '', 
    total_amount: 0,
    remaining_balance: 0, 
    monthly_payment: 0, 
    payment_day: '',
    nearest_working_day: 1,
    emoji: '📝'
  });

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'member';

  const getAssignees = useCallback((itemId) => assignments.filter(a => a.entity_id === itemId).map(a => members.find(m => m.id === a.member_id)).filter(Boolean), [assignments, members]);

  const fetchLoans = useCallback(async () => {
    if (!householdId || !financialProfileId) return;
    try {
      const [lRes, assRes] = await Promise.all([
          api.get(`/households/${householdId}/finance/loans?financial_profile_id=${financialProfileId}`),
          api.get(`/households/${householdId}/finance/assignments?entity_type=loan`)
      ]);
      setLoans(lRes.data || []);
      setAssignments(assRes.data || []);
    } catch (err) { console.error(err); }
  }, [api, householdId, financialProfileId]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
        try {
            await fetchLoans();
        } catch (e) { console.error(e); }
    };
    if (mounted) load();
    return () => { mounted = false; };
  }, [fetchLoans]);

  const selectedLoan = useMemo(() => 
    loans.find(l => String(l.id) === String(selectedLoanId)),
  [loans, selectedLoanId]);

  useEffect(() => {
    let active = true;
    if (selectedLoan && active) {
      setTimeout(() => {
        if (!active) return;
        setFormData({
          lender: selectedLoan.lender || '', 
          loan_type: selectedLoan.loan_type || '',
          total_amount: selectedLoan.total_amount || 0,
          remaining_balance: selectedLoan.remaining_balance || 0, 
          monthly_payment: selectedLoan.monthly_payment || 0,
          payment_day: selectedLoan.payment_day || '',
          nearest_working_day: selectedLoan.nearest_working_day ?? 1,
          emoji: selectedLoan.emoji || '📝'
        });
        setSelectedMembers(getAssignees(selectedLoan.id).map(m => m.id));
      }, 0);
    } else if (selectedLoanId === 'new' && active) {
      setTimeout(() => {
        if (!active) return;
        setFormData({
          lender: '', 
          loan_type: '', 
          total_amount: 0,
          remaining_balance: 0, 
          monthly_payment: 0, 
          payment_day: '',
          nearest_working_day: 1,
          emoji: '📝'
        });
        const defaultMember = members.find(m => m.id === currentUser?.id) || members.find(m => m.type !== 'pet');
        setSelectedMembers(defaultMember ? [defaultMember.id] : []);
      }, 0);
    }
    return () => { active = false; };
  }, [selectedLoan, selectedLoanId, getAssignees, members, currentUser]);

  const setLoanId = (id) => {
    const newParams = new URLSearchParams(location.search);
    if (id) newParams.set('selectedLoanId', id);
    else newParams.delete('selectedLoanId');
    navigate(`?${newParams.toString()}`, { replace: true });
  };

  const handleSave = async () => {
    try {
      const isNew = selectedLoanId === 'new';
      const url = isNew ? `/households/${householdId}/finance/loans` : `/households/${householdId}/finance/loans/${selectedLoanId}`;
      
      const payload = {
          ...formData,
          financial_profile_id: financialProfileId,
          total_amount: parseFloat(formData.total_amount) || 0,
          remaining_balance: parseFloat(formData.remaining_balance) || 0,
          monthly_payment: parseFloat(formData.monthly_payment) || 0,
          payment_day: formData.payment_day ? parseInt(formData.payment_day) : null
      };

      const res = await api[isNew ? 'post' : 'put'](url, payload);
      const itemId = isNew ? res.data.id : selectedLoanId;

      const currentIds = isNew ? [] : getAssignees(itemId).map(m => m.id);
      const toAdd = selectedMembers.filter(id => !currentIds.includes(id));
      const toRemove = currentIds.filter(id => !selectedMembers.includes(id));

      await Promise.all([
          ...toAdd.map(mid => api.post(`/households/${householdId}/finance/assignments`, { entity_type: 'loan', entity_id: itemId, member_id: mid })),
          ...toRemove.map(mid => api.delete(`/households/${householdId}/finance/assignments/loan/${itemId}/${mid}`))
      ]);
      
      showNotification(isNew ? "Loan added." : "Loan updated.", "success");
      await fetchLoans();
      setLoanId(null);
    } catch { showNotification("Error saving loan.", "danger"); }
  };

  return (
    <Box>
      <ModuleHeader 
          title="Loans & Debts"
          description="Track personal loans and debts."
          emoji="📝"
          isDark={isDark}
          action={isAdmin && (
              <Button variant="solid" startDecorator={<Add />} onClick={() => setLoanId('new')} sx={{ height: '44px' }}>Add Loan</Button>
          )}
      />

      <Grid container spacing={3}>
          {loans.length === 0 && (
              <Grid xs={12}>
                  <Typography level="body-lg" textAlign="center" sx={{ py: 10, opacity: 0.5 }}>No active loans found.</Typography>
              </Grid>
          )}
          {loans.map(loan => (
              <Grid key={loan.id} xs={12} lg={6} xl={4}>
                  <FinanceCard
                      title={loan.lender}
                      subtitle={loan.loan_type}
                      emoji={loan.emoji}
                      isDark={isDark}
                      balance={loan.remaining_balance}
                      balanceColor="danger"
                      currency={household?.currency}
                      subValue={loan.payment_day ? <Chip size="sm" variant="soft" color="neutral">Day {loan.payment_day}</Chip> : null}
                      assignees={getAssignees(loan.id)}
                      onEdit={() => setLoanId(loan.id)}
                      onDelete={() => confirmAction("Delete?", "Are you sure?", () => api.delete(`/households/${householdId}/finance/loans/${loan.id}`).then(() => fetchLoans()))}
                  >
                      <Grid container spacing={1}>
                          <Grid xs={6}>
                              <Typography level="body-xs" color="neutral">Total Loan</Typography>
                              <Typography level="body-sm">{formatCurrency(loan.total_amount, household?.currency)}</Typography>
                          </Grid>
                          <Grid xs={6}>
                              <Typography level="body-xs" color="neutral">Monthly</Typography>
                              <Typography level="body-sm" fontWeight="bold">{formatCurrency(loan.monthly_payment, household?.currency)}</Typography>
                          </Grid>
                      </Grid>
                  </FinanceCard>
              </Grid>
          ))}
      </Grid>

      <Modal open={Boolean(selectedLoanId)} onClose={() => setLoanId(null)}>
        <ModalDialog sx={{ maxWidth: 600, width: '100%', maxHeight: '95vh', overflowY: 'auto' }}>
          <ModalClose />
          <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'flex-start' }}>
                <Box sx={{ position: 'relative' }}>
                    <Avatar size="lg" sx={{ '--Avatar-size': '64px', bgcolor: getEmojiColor(formData.emoji, isDark), fontSize: '2rem', cursor: 'pointer' }} onClick={() => setEmojiPickerOpen(true)}>{formData.emoji}</Avatar>
                    <IconButton size="sm" variant="solid" color="primary" sx={{ position: 'absolute', bottom: -4, right: -4, borderRadius: '50%', border: '2px solid', borderColor: 'background.surface' }} onClick={() => setEmojiPickerOpen(true)}><Edit sx={{ fontSize: '0.8rem' }} /></IconButton>
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                    <Typography level="h4">{selectedLoanId === 'new' ? 'New Loan' : 'Edit Loan'}</Typography>
                    <Typography level="body-sm" color="neutral">Track personal loans and debts.</Typography>
                </Box>
          </Box>
          <Divider />
          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <FormControl required>
                <FormLabel>Lender</FormLabel>
                <Input 
                    name="lender"
                    value={formData.lender} 
                    onChange={e => setFormData({ ...formData, lender: e.target.value })} 
                />
            </FormControl>
            <FormControl required>
                <FormLabel>Loan Type</FormLabel>
                <Input 
                    name="loan_type"
                    value={formData.loan_type} 
                    onChange={e => setFormData({ ...formData, loan_type: e.target.value })} 
                />
            </FormControl>
            
            <Grid container spacing={2}>
                <Grid xs={6}>
                    <FormControl required>
                        <FormLabel>Total Loan Amount</FormLabel>
                        <Input 
                            name="total_amount"
                            type="number" 
                            slotProps={{ input: { step: 'any' } }}
                            startDecorator="£" 
                            value={formData.total_amount} 
                            onChange={e => setFormData({ ...formData, total_amount: e.target.value })} 
                        />
                    </FormControl>
                </Grid>
                <Grid xs={6}>
                    <FormControl required>
                        <FormLabel>Remaining Balance</FormLabel>
                        <Input 
                            name="remaining_balance"
                            type="number" 
                            slotProps={{ input: { step: 'any' } }}
                            startDecorator="£" 
                            value={formData.remaining_balance} 
                            onChange={e => setFormData({ ...formData, remaining_balance: e.target.value })} 
                        />
                    </FormControl>
                </Grid>
                <Grid xs={6}>
                    <FormControl required>
                        <FormLabel>Monthly Payment</FormLabel>
                        <Input 
                            name="monthly_payment"
                            type="number" 
                            slotProps={{ input: { step: 'any' } }}
                            startDecorator="£" 
                            value={formData.monthly_payment} 
                            onChange={e => setFormData({ ...formData, monthly_payment: e.target.value })} 
                        />
                    </FormControl>
                </Grid>
                <Grid xs={6}>
                    <FormControl>
                        <FormLabel>Payment Day</FormLabel>
                        <Input 
                            name="payment_day"
                            type="number" 
                            placeholder="1-31"
                            value={formData.payment_day} 
                            onChange={e => setFormData({ ...formData, payment_day: e.target.value })} 
                        />
                    </FormControl>
                </Grid>
                <Grid xs={12} sx={{ display: 'flex', alignItems: 'center' }}>
                    <Checkbox 
                        label="Nearest Working Day" 
                        name="nearest_working_day"
                        checked={formData.nearest_working_day !== 0}
                        onChange={e => setFormData({ ...formData, nearest_working_day: e.target.checked ? 1 : 0 })}
                    />
                </Grid>
                                        <Grid xs={12}>
                                            <FormControl><FormLabel>Assign Borrowers</FormLabel>
                                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {members.filter(m => m.type !== 'pet').map(m => {
                                const isSelected = selectedMembers.includes(m.id);
                                return (
                                    <Chip
                                        key={m.id}
                                        variant={isSelected ? 'solid' : 'outlined'}
                                        color={isSelected ? 'primary' : 'neutral'}
                                        onClick={() => setSelectedMembers(prev => prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id])}
                                        startDecorator={<Avatar size="sm" src={m.avatar}>{m.emoji}</Avatar>}
                                    >
                                        {m.alias || m.name}
                                    </Chip>
                                );
                            })}
                        </Box>
                    </FormControl>
                </Grid>
            </Grid>
            
            <Button size="lg" type="submit">Save</Button>
          </Stack>
          </form>
        </ModalDialog>
      </Modal>
      <EmojiPicker 
        open={emojiPickerOpen} 
        onClose={() => setEmojiPickerOpen(false)} 
        onEmojiSelect={(e) => { setFormData({ ...formData, emoji: e }); setEmojiPickerOpen(false); }} 
        isDark={isDark}
      />
    </Box>
  );
}