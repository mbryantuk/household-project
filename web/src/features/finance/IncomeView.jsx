import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext, useLocation, useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Grid, Card, Avatar, IconButton, 
  Button, Modal, ModalDialog, DialogTitle, DialogContent, DialogActions, Input,
  FormControl, FormLabel, Stack, Chip, CircularProgress, Divider,
  Checkbox, Sheet, Table
} from '@mui/joy';
import { Edit, Delete, Add, Star } from '@mui/icons-material';
import { format } from 'date-fns';
import { getEmojiColor } from '../../theme';
import AppSelect from '../../components/ui/AppSelect';
import EmojiPicker from '../../components/EmojiPicker';
import { getNextPayday, getDaysUntil } from '../../utils/dateUtils';

const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return num.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function IncomeView({ financialProfileId }) {
  const { api, id: householdId, user: currentUser, isDark, members } = useOutletContext();
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const selectedIncomeId = queryParams.get('selectedIncomeId');

  const [incomeList, setIncomeList] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);
  
  // Emoji State
  const [selectedEmoji, setSelectedEmoji] = useState('💰');
  const [emojiPicker, setEmojiPicker] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
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

  const getMemberName = useCallback((id) => {
      const m = members.find(m => m.id === parseInt(id));
      return m ? (m.alias || m.name) : 'Unassigned';
  }, [members]);

  const getBankName = useCallback((id) => {
      const b = bankAccounts.find(b => b.id === parseInt(id));
      return b ? (b.bank_name + ' ' + b.account_name) : '-';
  }, [bankAccounts]);

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
          } else {
              await api.put(`/households/${householdId}/finance/income/${selectedIncomeId}`, data);
          }
          fetchData();
          setIncomeId(null);
      } catch (err) {
          console.error("Failed to save income", err);
          alert("Failed to save: " + (err.response?.data?.error || err.message));
      }
  };

  const handleDelete = useCallback(async (id) => {
    if (!window.confirm("Delete this income source?")) return;
    try {
      await api.delete(`/households/${householdId}/finance/income/${id}`);
      fetchData();
      if (selectedIncomeId === String(id)) setIncomeId(null);
    } catch {
      alert("Failed to delete income source");
    }
  }, [api, householdId, fetchData, selectedIncomeId, setIncomeId]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

    return (
      <Box sx={{ overflowX: 'hidden' }}>
        <Box sx={{ 
            mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
            flexWrap: 'wrap', gap: 2 
        }}>
          <Box>
            <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>
              Income Sources
            </Typography>
            <Typography level="body-md" color="neutral">
              Manage salary, contracting, and other income streams.
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {isAdmin && (
                  <Button variant="solid" startDecorator={<Add />} onClick={() => setIncomeId('new')} sx={{ height: '44px' }}>
                      Add Income
                  </Button>
              )}
          </Box>
        </Box>

      {!isMobile ? (
        <Sheet variant="outlined" sx={{ borderRadius: 'sm', overflow: 'auto' }}>
            <Table hoverRow sx={{ '& tr > td': { verticalAlign: 'middle' } }}>
                <thead>
                    <tr>
                        <th style={{ width: 60 }}></th>
                        <th>Employer / Source</th>
                        <th>Type</th>
                        <th style={{ textAlign: 'right' }}>Net (Pay)</th>
                        <th>Freq</th>
                        <th>Next Payday</th>
                        <th>Assignee</th>
                        <th style={{ width: 100 }}></th>
                    </tr>
                </thead>
                <tbody>
                    {incomeList.map((row) => {
                        const nextPayDate = getNextPayday(row.payment_day);
                        return (
                            <tr key={row.id}>
                                <td>
                                    <Avatar size="sm" sx={{ bgcolor: getEmojiColor(row.emoji || (row.employer||'?')[0], isDark) }}>
                                        {row.emoji || (row.employer||'?')[0]}
                                    </Avatar>
                                </td>
                                <td>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography level="body-md" sx={{ fontWeight: 'lg' }}>{row.employer}</Typography>
                                        {row.is_primary === 1 && <Chip size="sm" color="primary" variant="solid" startDecorator={<Star sx={{ fontSize: '0.8rem' }}/>}>PRIMARY</Chip>}
                                    </Box>
                                    <Typography level="body-xs" color="neutral">{getBankName(row.bank_account_id)}</Typography>
                                </td>
                                <td>
                                    <Stack direction="row" spacing={0.5}>
                                        <Chip size="sm" variant="soft">{row.employment_type}</Chip>
                                        {row.work_type === 'part_time' && <Chip size="sm" color="warning">PT</Chip>}
                                    </Stack>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    <Typography fontWeight="bold" color="success">
                                        {formatCurrency(row.amount)}
                                    </Typography>
                                </td>
                                <td>{row.frequency}</td>
                                <td>
                                    {nextPayDate ? (
                                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                            <Typography level="body-sm" fontWeight="bold">{format(nextPayDate, 'do MMM')}</Typography>
                                            <Typography level="body-xs" color="neutral">{getDaysUntil(nextPayDate)} days</Typography>
                                        </Box>
                                    ) : '-'}
                                </td>
                                <td>{getMemberName(row.member_id)}</td>
                                <td>
                                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                                        <IconButton size="sm" variant="plain" onClick={() => setIncomeId(row.id)}><Edit /></IconButton>
                                        <IconButton size="sm" variant="plain" color="danger" onClick={() => handleDelete(row.id)}><Delete /></IconButton>
                                    </Box>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </Table>
        </Sheet>
      ) : (
        <Grid container spacing={2}>
            {incomeList.map(a => {
                const nextPayDate = getNextPayday(a.payment_day);
                return (
                <Grid xs={12} key={a.id}>
                    <Card variant="outlined" sx={{ flexDirection: 'row', gap: 2, p: 2, minHeight: '80px', borderLeft: a.is_primary ? '4px solid' : undefined, borderLeftColor: 'primary.solidBg' }}>
                        <Avatar size="lg" sx={{ bgcolor: getEmojiColor(a.emoji || (a.employer||'?')[0], isDark) }}>
                            {a.emoji || (a.employer||'?')[0]}
                        </Avatar>
                        <Box sx={{ flexGrow: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography level="title-md" sx={{ fontWeight: 'lg' }}>{a.employer}</Typography>
                                {a.is_primary === 1 && <Star color="primary" sx={{ fontSize: '1rem' }} />}
                            </Box>
                            <Typography level="body-sm">{a.role}</Typography>
                            <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                                <Chip size="sm" color="success">Net: {formatCurrency(a.amount)}</Chip>
                                <Chip size="sm" variant="outlined">{a.frequency}</Chip>
                                {nextPayDate && (
                                    <Chip size="sm" variant="outlined" color="primary">
                                        Next: {format(nextPayDate, 'do MMM')} ({getDaysUntil(nextPayDate)}d)
                                    </Chip>
                                )}
                                <Chip size="sm" variant="soft">{getMemberName(a.member_id)}</Chip>
                            </Box>
                        </Box>
                        <IconButton variant="plain" onClick={() => setIncomeId(a.id)} sx={{ minHeight: '44px', minWidth: '44px' }}>
                            <Edit />
                        </IconButton>
                    </Card>
                </Grid>
                );
            })}
        </Grid>
      )}

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