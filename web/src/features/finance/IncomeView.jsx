import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Grid, Card, Avatar, IconButton, 
  Button, Modal, ModalDialog, DialogTitle, DialogContent, DialogActions, Input,
  FormControl, FormLabel, Stack, Chip, CircularProgress, Divider,
  Sheet, Table
} from '@mui/joy';
import { Edit, Delete, Add } from '@mui/icons-material';
import { format } from 'date-fns';
import { getEmojiColor } from '../../theme';
import AppSelect from '../../components/ui/AppSelect';
import { getNextPayday, getDaysUntil } from '../../utils/dateUtils';

export default function IncomeView() {
  const { api, id: householdId, user: currentUser, isDark, members } = useOutletContext();
  const [incomeList, setIncomeList] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState(null);
  const [isNew, setIsNew] = useState(false);
  
  // Sorting & Filtering State
  const [sortConfig, setSortConfig] = useState({ key: 'employer', direction: 'asc' });
  const [filterQuery, setFilterQuery] = useState('');
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'member';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [incRes, bankRes] = await Promise.all([
          api.get(`/households/${householdId}/finance/income`),
          api.get(`/households/${householdId}/finance/current-accounts`)
      ]);
      setIncomeList(incRes.data || []);
      setBankAccounts(bankRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [api, householdId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derived State
  const processedData = incomeList
    .filter(a => 
        (a.employer || '').toLowerCase().includes(filterQuery.toLowerCase()) || 
        (a.role || '').toLowerCase().includes(filterQuery.toLowerCase())
    )
    .sort((a, b) => {
        const valA = a[sortConfig.key] || '';
        const valB = b[sortConfig.key] || '';
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

  const handleSort = (key) => {
      setSortConfig(prev => ({
          key,
          direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
      }));
  };

  const SortableHeader = ({ label, field, width }) => (
      <th style={{ width, cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort(field)}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {label}
              {sortConfig.key === field && (
                  <Typography level="body-xs">{sortConfig.direction === 'asc' ? '▲' : '▼'}</Typography>
              )}
          </Box>
      </th>
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      if (isNew) {
        await api.post(`/households/${householdId}/finance/income`, data);
      } else {
        await api.put(`/households/${householdId}/finance/income/${editItem.id}`, data);
      }
      fetchData();
      setEditItem(null);
      setIsNew(false);
    } catch (err) {
      alert("Failed to save");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this income source?")) return;
    try {
      await api.delete(`/households/${householdId}/finance/income/${id}`);
      fetchData();
    } catch (err) {
      alert("Failed to delete");
    }
  };

  const getMemberName = (id) => {
      const m = members.find(m => m.id === parseInt(id));
      return m ? (m.alias || m.name) : 'Unassigned';
  };

  const getBankName = (id) => {
      const b = bankAccounts.find(b => b.id === parseInt(id));
      return b ? (b.bank_name + ' ' + b.account_name) : '-';
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

    return (
      <Box>
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
                  <Button variant="solid" startDecorator={<Add />} onClick={() => { setEditItem({}); setIsNew(true); }}>
                      Add Income
                  </Button>
              )}
          </Box>
        </Box>

      {!isMobile ? (
        <Sheet variant="outlined" sx={{ borderRadius: 'sm', overflow: 'auto', flexGrow: 1 }}>
            <Table hoverRow stickyHeader>
                <thead>
                    <tr>
                        <th style={{ width: 50 }}></th>
                        <SortableHeader label="Employer / Source" field="employer" />
                        <SortableHeader label="Role" field="role" />
                        <SortableHeader label="Type" field="employment_type" width={120} />
                        <SortableHeader label="Gross (Ann)" field="gross_annual_salary" width={120} />
                        <SortableHeader label="Net (Pay)" field="amount" width={120} />
                        <SortableHeader label="Frequency" field="frequency" width={100} />
                        <th style={{ width: 120 }}>Next Payday</th>
                        <SortableHeader label="Assignee" field="member_id" width={150} />
                        {isAdmin && <th style={{ textAlign: 'right', width: 100 }}>Actions</th>}
                    </tr>
                </thead>
                <tbody>
                    {processedData.map((row) => {
                        const nextPayDate = getNextPayday(row.payment_day);
                        return (
                        <tr key={row.id}>
                            <td>
                                <Avatar size="sm" sx={{ bgcolor: getEmojiColor(row.emoji || (row.employer||'?')[0], isDark) }}>
                                    {row.emoji || (row.employer||'?')[0]}
                                </Avatar>
                            </td>
                            <td>
                                <Typography level="body-md" sx={{ fontWeight: 'lg' }}>{row.employer}</Typography>
                                <Typography level="body-xs" color="neutral">{getBankName(row.bank_account_id)}</Typography>
                            </td>
                            <td>{row.role}</td>
                            <td>
                                <Stack direction="row" spacing={0.5}>
                                    <Chip size="sm" variant="soft">{row.employment_type}</Chip>
                                    {row.work_type === 'part_time' && <Chip size="sm" color="warning">PT</Chip>}
                                </Stack>
                            </td>
                            <td>{row.gross_annual_salary ? `£${row.gross_annual_salary.toLocaleString()}` : '-'}</td>
                            <td>
                                <Typography fontWeight="bold" color="success">£{row.amount?.toLocaleString()}</Typography>
                            </td>
                            <td>{row.frequency}</td>
                            <td>
                                {nextPayDate ? (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                        <Chip size="sm" variant="outlined" color="primary">
                                            {format(nextPayDate, 'EEE do MMM')}
                                        </Chip>
                                        <Typography level="body-xs" color="neutral" sx={{ ml: 0.5 }}>
                                            {getDaysUntil(nextPayDate)} days
                                        </Typography>
                                    </Box>
                                ) : '-'}
                            </td>
                            <td>{getMemberName(row.member_id)}</td>
                            {isAdmin && (
                                <td style={{ textAlign: 'right' }}>
                                    <IconButton size="sm" variant="plain" onClick={() => { setEditItem(row); setIsNew(false); }}><Edit /></IconButton>
                                    <IconButton size="sm" variant="plain" color="danger" onClick={() => handleDelete(row.id)}><Delete /></IconButton>
                                </td>
                            )}
                        </tr>
                        );
                    })}
                </tbody>
            </Table>
        </Sheet>
      ) : (
        <Grid container spacing={2}>
            {processedData.map(a => {
                const nextPayDate = getNextPayday(a.payment_day);
                return (
                <Grid xs={12} key={a.id}>
                    <Card variant="outlined" sx={{ flexDirection: 'row', gap: 2 }}>
                        <Avatar size="lg" sx={{ bgcolor: getEmojiColor(a.emoji || (a.employer||'?')[0], isDark) }}>
                            {a.emoji || (a.employer||'?')[0]}
                        </Avatar>
                        <Box sx={{ flexGrow: 1 }}>
                            <Typography level="title-md" sx={{ fontWeight: 'lg' }}>{a.employer}</Typography>
                            <Typography level="body-sm">{a.role}</Typography>
                            <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                                <Chip size="sm" color="success">Net: £{a.amount}</Chip>
                                <Chip size="sm" variant="outlined">{a.frequency}</Chip>
                                {nextPayDate && (
                                    <Chip size="sm" variant="outlined" color="primary">
                                        Next: {format(nextPayDate, 'do MMM')} ({getDaysUntil(nextPayDate)}d)
                                    </Chip>
                                )}
                                <Chip size="sm" variant="soft">{getMemberName(a.member_id)}</Chip>
                            </Box>
                        </Box>
                        <IconButton variant="plain" onClick={() => { setEditItem(a); setIsNew(false); }}>
                            <Edit />
                        </IconButton>
                    </Card>
                </Grid>
                );
            })}
        </Grid>
      )}

      {/* EDIT MODAL */}
      <Modal open={Boolean(editItem)} onClose={() => setEditItem(null)}>
        <ModalDialog sx={{ maxWidth: 800, width: '100%', overflowY: 'auto' }}>
            <DialogTitle>{isNew ? 'Add Income Source' : `Edit ${editItem?.employer}`}</DialogTitle>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid xs={12} md={6}>
                            <FormControl required>
                                <FormLabel>Employer / Source Name</FormLabel>
                                <Input name="employer" defaultValue={editItem?.employer} />
                            </FormControl>
                        </Grid>
                        <Grid xs={12} md={6}>
                            <FormControl>
                                <FormLabel>Role / Job Title</FormLabel>
                                <Input name="role" defaultValue={editItem?.role} />
                            </FormControl>
                        </Grid>
                        
                        <Grid xs={12} md={6}>
                             <AppSelect 
                                label="Employment Type"
                                name="employment_type"
                                defaultValue={editItem?.employment_type || 'employed'}
                                options={[
                                    { value: 'employed', label: 'Employed' },
                                    { value: 'self_employed', label: 'Self Employed' },
                                    { value: 'contractor', label: 'Contractor' },
                                    { value: 'retired', label: 'Retired' },
                                    { value: 'unemployed', label: 'Unemployed' },
                                ]}
                            />
                        </Grid>
                        <Grid xs={12} md={6}>
                             <AppSelect 
                                label="Work Type"
                                name="work_type"
                                defaultValue={editItem?.work_type || 'full_time'}
                                options={[
                                    { value: 'full_time', label: 'Full Time' },
                                    { value: 'part_time', label: 'Part Time' },
                                ]}
                            />
                        </Grid>

                        <Grid xs={12} md={6}>
                            <FormControl>
                                <FormLabel>Assigned Person</FormLabel>
                                <AppSelect 
                                    name="member_id"
                                    defaultValue={editItem?.member_id}
                                    options={members.filter(m => m.type !== 'pet').map(m => ({ value: m.id, label: m.alias || m.name }))}
                                    placeholder="Select Person..."
                                />
                            </FormControl>
                        </Grid>
                        <Grid xs={12} md={6}>
                            <FormControl>
                                <FormLabel>Deposit to Account</FormLabel>
                                <AppSelect 
                                    name="bank_account_id"
                                    defaultValue={editItem?.bank_account_id}
                                    options={bankAccounts.map(b => ({ value: b.id, label: `${b.bank_name} - ${b.account_name}` }))}
                                    placeholder="Select Bank Account..."
                                />
                            </FormControl>
                        </Grid>

                        <Grid xs={12}><Divider>Financial Details</Divider></Grid>
                        
                        <Grid xs={6} md={3}>
                            <FormControl>
                                <FormLabel>Gross Annual (£)</FormLabel>
                                <Input name="gross_annual_salary" type="number" defaultValue={editItem?.gross_annual_salary} />
                            </FormControl>
                        </Grid>
                        <Grid xs={6} md={3}>
                            <FormControl>
                                <FormLabel>Net Pay (per freq)</FormLabel>
                                <Input name="amount" type="number" defaultValue={editItem?.amount} required />
                            </FormControl>
                        </Grid>
                        <Grid xs={6} md={3}>
                             <AppSelect 
                                label="Frequency"
                                name="frequency"
                                defaultValue={editItem?.frequency || 'monthly'}
                                options={[
                                    { value: 'weekly', label: 'Weekly' },
                                    { value: 'bi-weekly', label: 'Bi-Weekly' },
                                    { value: 'monthly', label: 'Monthly' },
                                    { value: 'annual', label: 'Annual' },
                                ]}
                            />
                        </Grid>
                        <Grid xs={6} md={3}>
                            <FormControl>
                                <FormLabel>Payment Day</FormLabel>
                                <Input name="payment_day" type="number" defaultValue={editItem?.payment_day} placeholder="e.g. 25" />
                            </FormControl>
                        </Grid>

                        <Grid xs={12}>
                            <FormControl>
                                <FormLabel>Add-ons / Bonuses (Description)</FormLabel>
                                <Input name="addons" defaultValue={editItem?.addons} placeholder="e.g. 10% annual bonus, stock options..." />
                            </FormControl>
                        </Grid>

                        <Grid xs={12} md={6}>
                            <FormControl>
                                <FormLabel>Notes</FormLabel>
                                <Input name="notes" defaultValue={editItem?.notes} />
                            </FormControl>
                        </Grid>
                        <Grid xs={12} md={6}>
                            <FormControl>
                                <FormLabel>Emoji</FormLabel>
                                <Input name="emoji" defaultValue={editItem?.emoji} />
                            </FormControl>
                        </Grid>

                    </Grid>
                    <DialogActions>
                        <Button variant="plain" color="neutral" onClick={() => setEditItem(null)}>Cancel</Button>
                        <Button type="submit" variant="solid">Save Income</Button>
                    </DialogActions>
                </form>
            </DialogContent>
        </ModalDialog>
      </Modal>
    </Box>
  );
}
