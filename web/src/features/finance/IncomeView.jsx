import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext, useLocation, useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Grid, Button, Modal, ModalDialog, DialogTitle, DialogContent, DialogActions, Input,
  FormControl, FormLabel, Stack, Checkbox, CircularProgress, Divider, Avatar, IconButton
} from '@mui/joy';
import { Add, Star, Edit } from '@mui/icons-material';
import { format } from 'date-fns';
import { getEmojiColor } from '../../theme';
import AppSelect from '../../components/ui/AppSelect';
import EmojiPicker from '../../components/EmojiPicker';
import ModuleHeader from '../../components/ui/ModuleHeader';
import FinanceCard from '../../components/ui/FinanceCard';
import { getNextPayday, getDaysUntil } from '../../utils/dateUtils';

export default function IncomeView({ financialProfileId }) {
  const { api, id: householdId, user: currentUser, isDark, members, confirmAction, showNotification } = useOutletContext();
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const selectedIncomeId = queryParams.get('selectedIncomeId');

  const [incomeList, setIncomeList] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Emoji State
  const [selectedEmoji, setSelectedEmoji] = useState('💰');
  const [emojiPicker, setEmojiPicker] = useState(false);
  
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'member';

  const fetchData = useCallback(async () => {
    if (!financialProfileId) return;
    setLoading(true);
    try {
      const [incRes, bankRes] = await Promise.all([
          api.get(`/households/${householdId}/finance/income?financial_profile_id=${financialProfileId}`),
          api.get(`/households/${householdId}/finance/current-accounts?financial_profile_id=${financialProfileId}`)
      ]);
      setIncomeList(incRes.data || []);
      setBankAccounts(bankRes.data || []);
    } catch (err) {
      console.error("Failed to fetch income data", err);
    } finally {
      setLoading(false);
    }
  }, [api, householdId, financialProfileId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectedIncome = useMemo(() => 
    incomeList.find(i => String(i.id) === String(selectedIncomeId)),
  [incomeList, selectedIncomeId]);

  // Sync Emoji State
  useEffect(() => {
    if (selectedIncome) {
        setSelectedEmoji(selectedIncome.emoji || '💰');
    } else if (selectedIncomeId === 'new') {
        setSelectedEmoji('💰');
    }
  }, [selectedIncome, selectedIncomeId]);

  const setIncomeId = useCallback((id) => {
    const newParams = new URLSearchParams(location.search);
    if (id) newParams.set('selectedIncomeId', id);
    else newParams.delete('selectedIncomeId');
    navigate(`?${newParams.toString()}`, { replace: true });
  }, [location.search, navigate]);

  const getMember = useCallback((id) => {
      return members.find(m => m.id === parseInt(id));
  }, [members]);

  const handleSubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = Object.fromEntries(fd.entries());
      data.emoji = selectedEmoji;
      data.is_primary = data.is_primary ? 1 : 0;
      data.nearest_working_day = data.nearest_working_day ? 1 : 0;
      data.financial_profile_id = financialProfileId;

      try {
          if (selectedIncomeId === 'new') {
              await api.post(`/households/${householdId}/finance/income`, data);
              showNotification("Income source added", "success");
          } else {
              await api.put(`/households/${householdId}/finance/income/${selectedIncomeId}`, data);
              showNotification("Income source updated", "success");
          }
          fetchData();
          setIncomeId(null);
      } catch (err) {
          console.error("Failed to save income", err);
          showNotification("Failed to save: " + (err.response?.data?.error || err.message), "danger");
      }
  };

  const handleDelete = useCallback(async (id) => {
    confirmAction("Delete Income", "Delete this income source? This will remove it from your budget.", async () => {
        try {
          await api.delete(`/households/${householdId}/finance/income/${id}`);
          showNotification("Income deleted", "success");
          fetchData();
          if (selectedIncomeId === String(id)) setIncomeId(null);
        } catch {
          showNotification("Failed to delete income source", "danger");
        }
    });
  }, [api, householdId, fetchData, selectedIncomeId, setIncomeId, confirmAction, showNotification]);

  const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return num.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

    return (
      <Box sx={{ overflowX: 'hidden' }}>
        <ModuleHeader 
            title="Income Sources"
            description="Manage salary, contracting, and other income streams."
            emoji="💰"
            isDark={isDark}
            action={isAdmin && (
                <Button variant="solid" startDecorator={<Add />} onClick={() => setIncomeId('new')} sx={{ height: '44px' }}>
                    Add Income
                </Button>
            )}
        />

        <Grid container spacing={3}>
            {incomeList.map(a => {
                const nextPayDate = getNextPayday(a.payment_day);
                const assignedMember = getMember(a.member_id);

                return (
                <Grid xs={12} lg={6} xl={4} key={a.id}>
                    <FinanceCard
                        title={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {a.employer}
                                {a.is_primary === 1 && <Star color="primary" sx={{ fontSize: '1rem' }} />}
                            </Box>
                        }
                        subtitle={a.role}
                        emoji={a.emoji || (a.employer||'?')[0]}
                        isDark={isDark}
                        balance={a.amount}
                        balanceColor="success"
                        subValue={a.frequency}
                        assignees={assignedMember ? [assignedMember] : []}
                        onEdit={() => setIncomeId(a.id)}
                        onDelete={() => handleDelete(a.id)}
                    >
                        <Grid container spacing={1}>
                            <Grid xs={6}>
                                <Typography level="body-xs" color="neutral">Next Payday</Typography>
                                <Typography level="body-sm" fontWeight="bold">
                                    {nextPayDate ? `${format(nextPayDate, 'do MMM')} (${getDaysUntil(nextPayDate)}d)` : 'N/A'}
                                </Typography>
                            </Grid>
                            <Grid xs={6}>
                                <Typography level="body-xs" color="neutral">Gross Annual</Typography>
                                <Typography level="body-sm">{a.gross_annual_salary ? formatCurrency(a.gross_annual_salary) : '-'}</Typography>
                            </Grid>
                        </Grid>
                    </FinanceCard>
                </Grid>
                );
            })}
        </Grid>

      <Modal open={Boolean(selectedIncomeId)} onClose={() => setIncomeId(null)}>
        <ModalDialog sx={{ maxWidth: 800, width: '100%', maxHeight: '95vh', overflowY: 'auto' }}>
            <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'flex-start' }}>
                <Box sx={{ position: 'relative' }}>
                    <Avatar size="lg" sx={{ '--Avatar-size': '64px', bgcolor: getEmojiColor(selectedEmoji, isDark), fontSize: '2rem', cursor: 'pointer' }} onClick={() => setEmojiPicker(true)}>{selectedEmoji}</Avatar>
                    <IconButton size="sm" variant="solid" color="primary" sx={{ position: 'absolute', bottom: -4, right: -4, borderRadius: '50%', border: '2px solid', borderColor: 'background.surface' }} onClick={() => setEmojiPicker(true)}><Edit sx={{ fontSize: '0.8rem' }} /></IconButton>
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                    <DialogTitle>{selectedIncomeId === 'new' ? 'Add Income Source' : `Edit ${selectedIncome?.employer}`}</DialogTitle>
                    <Typography level="body-sm" color="neutral">Capture salary details and payment schedules.</Typography>
                </Box>
            </Box>
            <DialogContent sx={{ overflowX: 'hidden' }}>
                <form onSubmit={handleSubmit}>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid xs={12} md={6}>
                            <FormControl required><FormLabel>Employer / Source Name</FormLabel><Input name="employer" defaultValue={selectedIncome?.employer} /></FormControl>
                        </Grid>
                        <Grid xs={12} md={6}>
                            <FormControl><FormLabel>Role / Job Title</FormLabel><Input name="role" defaultValue={selectedIncome?.role} /></FormControl>
                        </Grid>
                        <Grid xs={12} md={6}>
                             <AppSelect label="Employment Type" name="employment_type" defaultValue={selectedIncome?.employment_type || 'employed'} options={[{ value: 'employed', label: 'Employed' }, { value: 'self_employed', label: 'Self Employed' }, { value: 'contractor', label: 'Contractor' }, { value: 'retired', label: 'Retired' }, { value: 'unemployed', label: 'Unemployed' }]} />
                        </Grid>
                        <Grid xs={12} md={6}>
                             <AppSelect label="Work Type" name="work_type" defaultValue={selectedIncome?.work_type || 'full_time'} options={[{ value: 'full_time', label: 'Full Time' }, { value: 'part_time', label: 'Part Time' }]} />
                        </Grid>
                        <Grid xs={12} md={6}>
                            <AppSelect label="Assigned Person" name="member_id" defaultValue={String(selectedIncome?.member_id || '')} options={members.filter(m => m.type !== 'pet').map(m => ({ value: String(m.id), label: m.alias || m.name }))} placeholder="Select Person..." />
                        </Grid>
                        <Grid xs={12} md={6}>
                            <AppSelect label="Deposit to Account" name="bank_account_id" defaultValue={String(selectedIncome?.bank_account_id || '')} options={bankAccounts.map(b => ({ value: String(b.id), label: `${b.bank_name} - ${b.account_name}` }))} placeholder="Select Bank Account..." />
                        </Grid>
                        <Grid xs={12}><Divider>Financial Details</Divider></Grid>
                        <Grid xs={12} sm={6} md={3}>
                            <FormControl><FormLabel>Gross Annual (£)</FormLabel><Input name="gross_annual_salary" type="number" slotProps={{ input: { step: 'any' } }} defaultValue={selectedIncome?.gross_annual_salary} /></FormControl>
                        </Grid>
                        <Grid xs={12} sm={6} md={3}>
                            <FormControl required><FormLabel>Net Pay (per freq)</FormLabel><Input name="amount" type="number" slotProps={{ input: { step: 'any' } }} defaultValue={selectedIncome?.amount} /></FormControl>
                        </Grid>
                        <Grid xs={12} sm={6} md={3}>
                             <AppSelect label="Frequency" name="frequency" defaultValue={selectedIncome?.frequency || 'monthly'} options={[{ value: 'weekly', label: 'Weekly' }, { value: 'bi-weekly', label: 'Bi-Weekly' }, { value: 'monthly', label: 'Monthly' }, { value: 'annual', label: 'Annual' }]} />
                        </Grid>
                        <Grid xs={12} sm={6} md={3}>
                            <FormControl required><FormLabel>Payment Day</FormLabel><Input name="payment_day" type="number" min="1" max="31" defaultValue={selectedIncome?.payment_day} placeholder="e.g. 25" /></FormControl>
                        </Grid>
                        <Grid xs={12}><FormControl><FormLabel>Add-ons / Bonuses (Description)</FormLabel><Input name="addons" defaultValue={selectedIncome?.addons} placeholder="e.g. 10% annual bonus, stock options..." /></FormControl></Grid>
                        <Grid xs={12}><FormControl><FormLabel>Notes</FormLabel><Input name="notes" defaultValue={selectedIncome?.notes} /></FormControl></Grid>
                        <Grid xs={12}>
                            <Stack direction="row" spacing={2}>
                                <Checkbox label="Primary Paycheck (Drivers Budget Cycle)" name="is_primary" defaultChecked={selectedIncome?.is_primary === 1} value="1" />
                                <Checkbox label="Nearest Working Day (Prior)" name="nearest_working_day" defaultChecked={selectedIncome?.nearest_working_day !== 0} value="1" />
                            </Stack>
                        </Grid>
                    </Grid>
                    <DialogActions sx={{ mt: 2 }}>
                        <Button variant="plain" color="neutral" onClick={() => setIncomeId(null)} sx={{ height: '44px' }}>Cancel</Button>
                        <Button type="submit" variant="solid" sx={{ height: '44px' }}>Save Income</Button>
                    </DialogActions>
                </form>
            </DialogContent>
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
