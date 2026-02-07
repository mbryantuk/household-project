import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext, useLocation, useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Button, Sheet, Divider, Table, IconButton, 
  Modal, ModalDialog, ModalClose, FormControl, FormLabel, Input, 
  Stack, Avatar, Checkbox, Grid, Chip, AvatarGroup, DialogActions
} from '@mui/joy';
import { Add, Edit, Delete, RequestQuote, GroupAdd } from '@mui/icons-material';
import { getEmojiColor } from '../../theme';
import EmojiPicker from '../../components/EmojiPicker';
import AppHeader from '../../components/ui/AppHeader';

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
  const [assignItem, setAssignItem] = useState(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState('📝');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    lender: '', 
    loan_type: '', 
    total_amount: 0,
    remaining_balance: 0, 
    monthly_payment: 0, 
    payment_day: '',
    nearest_working_day: 1
  });

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'member';

  const getAssignees = useCallback((itemId) => assignments.filter(a => a.entity_id === itemId).map(a => members.find(m => m.id === a.member_id)).filter(Boolean), [assignments, members]);

  const fetchLoans = useCallback(async () => {
    if (!householdId || !financialProfileId) return;
    setLoading(true);
    try {
      const [lRes, assRes] = await Promise.all([
          api.get(`/households/${householdId}/finance/loans?financial_profile_id=${financialProfileId}`),
          api.get(`/households/${householdId}/finance/assignments?entity_type=loan`)
      ]);
      setLoans(lRes.data || []);
      setAssignments(assRes.data || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [api, householdId, financialProfileId]);

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  const selectedLoan = useMemo(() => 
    loans.find(l => String(l.id) === String(selectedLoanId)),
  [loans, selectedLoanId]);

  useEffect(() => {
    if (selectedLoan) {
      setFormData({
        lender: selectedLoan.lender || '', 
        loan_type: selectedLoan.loan_type || '',
        total_amount: selectedLoan.total_amount || 0,
        remaining_balance: selectedLoan.remaining_balance || 0, 
        monthly_payment: selectedLoan.monthly_payment || 0,
        payment_day: selectedLoan.payment_day || '',
        nearest_working_day: selectedLoan.nearest_working_day ?? 1
      });
      setSelectedEmoji(selectedLoan.emoji || '📝');
      setSelectedMembers(getAssignees(selectedLoan.id).map(m => m.id));
    } else if (selectedLoanId === 'new') {
      setFormData({
        lender: '', 
        loan_type: '', 
        total_amount: 0,
        remaining_balance: 0, 
        monthly_payment: 0, 
        payment_day: '',
        nearest_working_day: 1
      });
      setSelectedEmoji('📝');
      const defaultMember = members.find(m => m.id === currentUser?.id) || members.find(m => m.type !== 'pet');
      setSelectedMembers(defaultMember ? [defaultMember.id] : []);
    }
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
          emoji: selectedEmoji,
          financial_profile_id: financialProfileId,
          total_amount: parseFloat(formData.total_amount) || 0,
          remaining_balance: parseFloat(formData.remaining_balance) || 0,
          monthly_payment: parseFloat(formData.monthly_payment) || 0,
          payment_day: formData.payment_day ? parseInt(formData.payment_day) : null
      };

      const res = await api[isNew ? 'post' : 'put'](url, payload);
      const itemId = isNew ? res.data.id : selectedLoanId;

      // Handle Assignments
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

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this loan?")) return;
    try { 
        await api.delete(`/households/${householdId}/finance/loans/${id}`); 
        fetchLoans(); 
        if (selectedLoanId === String(id)) setLoanId(null);
    } catch { alert("Failed to delete"); }
  };

  const handleAssignMember = async (memberId) => {
      try {
          await api.post(`/households/${householdId}/finance/assignments`, {
              entity_type: 'loan', entity_id: assignItem.id, member_id: memberId
          });
          const assRes = await api.get(`/households/${householdId}/finance/assignments?entity_type=loan`);
          setAssignments(assRes.data || []);
      } catch (err) { console.error("Assignment failed", err); }
  };

  const handleUnassignMember = async (memberId) => {
      try {
          await api.delete(`/households/${householdId}/finance/assignments/loan/${assignItem.id}/${memberId}`);
          const assRes = await api.get(`/households/${householdId}/finance/assignments?entity_type=loan`);
          setAssignments(assRes.data || []);
      } catch (err) { console.error("Removal failed", err); }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  return (
    <Box>
      <AppHeader 
        title="Loans"
        description="Track personal loans and debts."
        endDecorator={
          isAdmin && (
            <Button startDecorator={<Add />} onClick={() => setLoanId('new')}>
              Add Loan
            </Button>
          )
        }
      />

      <Sheet variant="outlined" sx={{ borderRadius: 'md', overflow: 'auto' }}>
        <Table hoverRow>
          <thead>
            <tr>
              <th style={{ width: 40 }}></th>
              <th>Lender</th>
              <th>Type</th>
              <th style={{ textAlign: 'right' }}>Total</th>
              <th style={{ textAlign: 'right' }}>Balance</th>
              <th style={{ textAlign: 'right' }}>Payment</th>
              <th style={{ textAlign: 'right', width: 80 }}>Day</th>
              <th>Assignees</th>
              <th style={{ width: 100 }}></th>
            </tr>
          </thead>
          <tbody>
            {loans.map(loan => (
              <tr key={loan.id}>
                <td><Avatar size="sm" sx={{ bgcolor: getEmojiColor(loan.emoji, isDark) }}>{loan.emoji}</Avatar></td>
                <td><Typography fontWeight="lg">{loan.lender}</Typography></td>
                <td>{loan.loan_type}</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(loan.total_amount, household?.currency)}</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(loan.remaining_balance, household?.currency)}</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(loan.monthly_payment, household?.currency)}</td>
                <td style={{ textAlign: 'right' }}>{loan.payment_day || '-'}</td>
                <td>
                    <AvatarGroup size="sm">
                        {getAssignees(loan.id).map(m => (
                            <Avatar key={m.id} src={m.avatar}>{m.emoji}</Avatar>
                        ))}
                    </AvatarGroup>
                </td>
                <td>
                  {isAdmin && (
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton size="sm" onClick={() => setLoanId(loan.id)}><Edit /></IconButton>
                      <IconButton size="sm" color="danger" onClick={() => confirmAction("Delete?", "Are you sure?", () => api.delete(`/households/${householdId}/finance/loans/${loan.id}`).then(() => { fetchLoans(); if (selectedLoanId === String(loan.id)) setLoanId(null); }))}><Delete /></IconButton>
                    </Box>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Sheet>

      <Modal open={Boolean(selectedLoanId)} onClose={() => setLoanId(null)}>
        <ModalDialog sx={{ maxWidth: 600, width: '100%', maxHeight: '95vh', overflowY: 'auto' }}>
          <ModalClose />
          <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'flex-start' }}>
                <Box sx={{ position: 'relative' }}>
                    <Avatar size="lg" sx={{ '--Avatar-size': '64px', bgcolor: getEmojiColor(selectedEmoji, isDark), fontSize: '2rem', cursor: 'pointer' }} onClick={() => setEmojiPickerOpen(true)}>{selectedEmoji}</Avatar>
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
                <Input name="lender" value={formData.lender} onChange={e => setFormData({ ...formData, lender: e.target.value })} />
            </FormControl>
            <FormControl required>
                <FormLabel>Loan Type</FormLabel>
                <Input name="loan_type" value={formData.loan_type} onChange={e => setFormData({ ...formData, loan_type: e.target.value })} />
            </FormControl>
            
            <Grid container spacing={2}>
                <Grid xs={6}>
                    <FormControl required>
                        <FormLabel>Total Loan Amount</FormLabel>
                        <Input name="total_amount" type="number" slotProps={{ input: { step: 'any' } }} value={formData.total_amount} onChange={e => setFormData({ ...formData, total_amount: e.target.value })} startDecorator="£" />
                    </FormControl>
                </Grid>
                <Grid xs={6}>
                    <FormControl required>
                        <FormLabel>Remaining Balance</FormLabel>
                        <Input name="remaining_balance" type="number" slotProps={{ input: { step: 'any' } }} value={formData.remaining_balance} onChange={e => setFormData({ ...formData, remaining_balance: e.target.value })} startDecorator="£" />
                    </FormControl>
                </Grid>
                <Grid xs={6}>
                    <FormControl required>
                        <FormLabel>Monthly Payment</FormLabel>
                        <Input name="monthly_payment" type="number" slotProps={{ input: { step: 'any' } }} value={formData.monthly_payment} onChange={e => setFormData({ ...formData, monthly_payment: e.target.value })} startDecorator="£" />
                    </FormControl>
                </Grid>
                <Grid xs={6}>
                    <FormControl>
                        <FormLabel>Payment Day</FormLabel>
                        <Input name="payment_day" type="number" placeholder="1-31" value={formData.payment_day} onChange={e => setFormData({ ...formData, payment_day: e.target.value })} />
                    </FormControl>
                </Grid>
                <Grid xs={12} sx={{ display: 'flex', alignItems: 'center' }}>
                    <Checkbox label="Nearest Working Day" name="nearest_working_day" checked={formData.nearest_working_day !== 0} onChange={e => setFormData({ ...formData, nearest_working_day: e.target.checked ? 1 : 0 })} />
                </Grid>
                <Grid xs={12}>
                    <FormControl>
                        <FormLabel>Assign Members</FormLabel>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {members.filter(m => m.type !== 'pet').map(m => {
                                const isSelected = selectedMembers.includes(m.id);
                                return (
                                    <Chip key={m.id} variant={isSelected ? 'solid' : 'outlined'} color={isSelected ? 'primary' : 'neutral'} onClick={() => setSelectedMembers(prev => prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id])} startDecorator={<Avatar size="sm" src={m.avatar}>{m.emoji}</Avatar>}>
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
            <DialogActions><Button onClick={() => setAssignItem(null)}>Done</Button></DialogActions>
        </ModalDialog>
      </Modal>

      <EmojiPicker open={emojiPickerOpen} onClose={() => setEmojiPickerOpen(false)} onEmojiSelect={(e) => { setSelectedEmoji(e); setEmojiPickerOpen(false); }} isDark={isDark} />
    </Box>
  );
}