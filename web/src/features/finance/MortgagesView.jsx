import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Grid, Card, Avatar, IconButton, 
  Button, Modal, ModalDialog, DialogTitle, DialogContent, DialogActions, Input,
  FormControl, FormLabel, Stack, Chip, CircularProgress, Divider,
  AvatarGroup, LinearProgress, Table, Sheet, Dropdown, Menu, MenuButton, MenuItem
} from '@mui/joy';
import { Edit, Delete, Add, GroupAdd, Home, InfoOutlined, ArrowDropDown } from '@mui/icons-material';
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

export default function MortgagesView() {
  const { api, id: householdId, user: currentUser, isDark, members } = useOutletContext();
  const [mortgages, setMortgages] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [editItem, setEditItem] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [activeType, setActiveType] = useState('mortgage'); // 'mortgage' | 'equity'
  const [assignItem, setAssignItem] = useState(null);
  const [emojiPicker, setEmojiPicker] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState('🏠');
  const [selectedMembers, setSelectedMembers] = useState([]);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'member';

  useEffect(() => {
      if (editItem) {
          setSelectedEmoji(editItem.emoji || (editItem.mortgage_type === 'equity' ? '💰' : '🏠'));
          setSelectedMembers(getAssignees(editItem.id).map(m => m.id));
          setActiveType(editItem.mortgage_type || 'mortgage');
      } else if (isNew) {
          setSelectedEmoji(activeType === 'equity' ? '💰' : '🏠');
          setSelectedMembers([currentUser?.id].filter(Boolean));
      }
  }, [editItem, isNew, activeType]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [res, assRes] = await Promise.all([
          api.get(`/households/${householdId}/finance/mortgages`),
          api.get(`/households/${householdId}/finance/assignments?entity_type=finance_mortgages`)
      ]);
      setMortgages(res.data || []);
      setAssignments(assRes.data || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [api, householdId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    // Ensure numeric fields are numbers or zero
    const numericFields = ['estimated_value', 'other_secured_debt', 'total_amount', 'remaining_balance', 'interest_rate', 'monthly_payment', 'term_years', 'equity_loan_amount', 'equity_loan_interest_rate', 'equity_loan_cpi_rate'];
    numericFields.forEach(field => {
        if (data[field] === '') data[field] = 0;
    });

    try {
      let itemId = editItem?.id;
      if (isNew) {
        const res = await api.post(`/households/${householdId}/finance/mortgages`, { ...data, mortgage_type: activeType });
        itemId = res.data.id;
      } else {
        await api.put(`/households/${householdId}/finance/mortgages/${itemId}`, data);
      }
      
      const currentIds = isNew ? [] : getAssignees(itemId).map(m => m.id);
      const toAdd = selectedMembers.filter(id => !currentIds.includes(id));
      await Promise.all(toAdd.map(mid => api.post(`/households/${householdId}/finance/assignments`, {
          entity_type: 'finance_mortgages', entity_id: itemId, member_id: mid
      })));
      const toRemove = currentIds.filter(id => !selectedMembers.includes(id));
      await Promise.all(toRemove.map(mid => api.delete(`/households/${householdId}/finance/assignments/finance_mortgages/${itemId}/${mid}`)));
      
      fetchData();
      setEditItem(null);
      setIsNew(false);
    } catch (err) { alert("Failed to save: " + err.message); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this item?")) return;
    try { await api.delete(`/households/${householdId}/finance/mortgages/${id}`); fetchData(); } catch (err) { alert("Failed to delete"); }
  };

  const handleAssignMember = async (memberId) => {
      try {
          await api.post(`/households/${householdId}/finance/assignments`, {
              entity_type: 'finance_mortgages', entity_id: assignItem.id, member_id: memberId
          });
          const assRes = await api.get(`/households/${householdId}/finance/assignments?entity_type=finance_mortgages`);
          setAssignments(assRes.data || []);
      } catch (err) { console.error(err); }
  };

  const handleUnassignMember = async (memberId) => {
      try {
          await api.delete(`/households/${householdId}/finance/assignments/finance_mortgages/${assignItem.id}/${memberId}`);
          const assRes = await api.get(`/households/${householdId}/finance/assignments?entity_type=finance_mortgages`);
          setAssignments(assRes.data || []);
      } catch (err) { console.error(err); }
  };

  const getAssignees = (itemId) => assignments.filter(a => a.entity_id === itemId).map(a => members.find(m => m.id === a.member_id)).filter(Boolean);

  const calculateH2BProjections = (amount, startDate, initialRate, cpiRate) => {
      if (!amount || !startDate) return null;
      const start = new Date(startDate);
      const now = new Date();
      const projections = [];
      const baseAmount = parseFloat(amount);
      const initialFeeRate = parseFloat(initialRate) || 1.75;
      const cpiPlusTwo = (parseFloat(cpiRate) || 2.0) + 2.0;

      for (let i = 1; i <= 5; i++) {
          const year = now.getFullYear() + i - 1;
          const ageOfLoan = year - start.getFullYear();
          let annualFee = 0;
          let rateDisplay = "0.00%";
          if (ageOfLoan >= 5) { 
              if (ageOfLoan === 5) {
                  annualFee = baseAmount * (initialFeeRate / 100);
                  rateDisplay = initialFeeRate.toFixed(2) + "%";
              } else {
                  const escalationFactor = 1 + (cpiPlusTwo / 100);
                  let escalatedRate = initialFeeRate;
                  for (let y = 6; y <= ageOfLoan; y++) escalatedRate *= escalationFactor;
                  annualFee = baseAmount * (escalatedRate / 100);
                  rateDisplay = escalatedRate.toFixed(2) + "%";
              }
          }
          projections.push({ year, age: ageOfLoan + 1, fee: annualFee, rate: rateDisplay });
      }
      return projections;
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  return (
    <Box>
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box>
                <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>Mortgages & Equity</Typography>
                <Typography level="body-md" color="neutral">Track property loans and home equity loans separately.</Typography>
            </Box>
            {isAdmin && (
                <Dropdown>
                    <MenuButton 
                        variant="solid" 
                        color="primary" 
                        startDecorator={<Add />} 
                        endDecorator={<ArrowDropDown />}
                    >
                        Add New
                    </MenuButton>
                    <Menu placement="bottom-end">
                        <MenuItem onClick={() => { setEditItem({}); setIsNew(true); setActiveType('mortgage'); }}>Add Mortgage</MenuItem>
                        <MenuItem onClick={() => { setEditItem({}); setIsNew(true); setActiveType('equity'); }}>Add Equity Loan</MenuItem>
                    </Menu>
                </Dropdown>
            )}
        </Box>

        <Grid container spacing={3}>
            {mortgages.map(mort => {
                const isEquityType = mort.mortgage_type === 'equity';
                const main = parseFloat(mort.remaining_balance) || 0;
                const extra = parseFloat(mort.other_secured_debt) || 0;
                const h2bPayback = parseFloat(mort.equity_loan_amount) || 0;
                
                const totalDue = isEquityType ? h2bPayback : (main + extra);
                const soldPrice = parseFloat(mort.estimated_value) || 0;
                const equityValue = soldPrice - totalDue;
                
                const progress = !isEquityType && (parseFloat(mort.total_amount) || 0) > 0 ? ((parseFloat(mort.total_amount) - main) / parseFloat(mort.total_amount)) * 100 : 0;
                
                const h2bProjections = isEquityType && h2bPayback > 0 ? calculateH2BProjections(
                    mort.equity_loan_amount, mort.equity_loan_start_date, mort.equity_loan_interest_rate, mort.equity_loan_cpi_rate
                ) : null;

                return (
                    <Grid xs={12} key={mort.id}>
                        <Card variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
                            <Grid container spacing={3}>
                                <Grid xs={12} md={4}>
                                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                                        <Avatar size="xl" sx={{ '--Avatar-size': '64px', bgcolor: getEmojiColor(mort.emoji || (isEquityType ? '💰' : '🏠'), isDark), fontSize: '2rem' }}>
                                            {mort.emoji || (isEquityType ? '💰' : '🏠')}
                                        </Avatar>
                                        <Box sx={{ flexGrow: 1 }}>
                                            <Typography level="title-lg">{mort.lender}</Typography>
                                            <Typography level="body-sm" color="neutral">{mort.property_address}</Typography>
                                            <Chip size="sm" variant="soft" color={isEquityType ? 'warning' : 'primary'} sx={{ mt: 0.5 }}>
                                                {isEquityType ? 'Equity Loan' : 'Mortgage'}
                                            </Chip>
                                        </Box>
                                    </Box>
                                    <Sheet variant="soft" sx={{ p: 2, borderRadius: 'md', bgcolor: 'background.level1' }}>
                                        <Typography level="title-sm" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                                            {isEquityType ? <InfoOutlined fontSize="small" /> : <Home fontSize="small" />} 
                                            {isEquityType ? 'Loan Summary' : 'Mortgage Summary'}
                                        </Typography>
                                        <Stack spacing={1}>
                                            {!isEquityType ? (
                                                <>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <Typography level="body-xs">Main Balance</Typography>
                                                        <Typography level="body-sm" fontWeight="bold">{formatCurrency(main)}</Typography>
                                                    </Box>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <Typography level="body-xs">Extra Secured</Typography>
                                                        <Typography level="body-sm" fontWeight="bold">{formatCurrency(extra)}</Typography>
                                                    </Box>
                                                </>
                                            ) : (
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <Typography level="body-xs">Equity Loan</Typography>
                                                    <Typography level="body-sm" fontWeight="bold">{formatCurrency(h2bPayback)}</Typography>
                                                </Box>
                                            )}
                                            <Divider />
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <Typography level="body-xs">Total Debt</Typography>
                                                <Typography level="body-sm" fontWeight="bold" color="danger">{formatCurrency(totalDue)}</Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <Typography level="body-xs">Property Value</Typography>
                                                <Typography level="body-sm" fontWeight="bold">{formatCurrency(soldPrice)}</Typography>
                                            </Box>
                                            <Divider />
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                                                <Typography level="title-md">Net Equity</Typography>
                                                <Typography level="title-lg" color="success">{formatCurrency(equityValue)}</Typography>
                                            </Box>
                                        </Stack>
                                    </Sheet>
                                    <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                                        <Button size="sm" variant="plain" startDecorator={<Edit />} onClick={() => { setEditItem(mort); setIsNew(false); }}>Edit</Button>
                                        <IconButton size="sm" variant="plain" onClick={() => setAssignItem(mort)}><GroupAdd /></IconButton>
                                    </Box>
                                </Grid>

                                <Grid xs={12} md={8}>
                                    {!isEquityType && (
                                        <Box sx={{ mb: 3 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                <Typography level="body-xs" fontWeight="bold">PRINCIPAL REPAYMENT PROGRESS</Typography>
                                                <Typography level="body-xs" fontWeight="bold">{progress.toFixed(2)}%</Typography>
                                            </Box>
                                            <LinearProgress determinate value={Math.min(progress, 100)} color="success" sx={{ height: 10, borderRadius: 5 }} />
                                        </Box>
                                    )}

                                    <Grid container spacing={2}>
                                        <Grid xs={6} sm={3}>
                                            <Typography level="body-xs" color="neutral">Monthly Pay</Typography>
                                            <Typography level="body-md" fontWeight="bold">{formatCurrency(mort.monthly_payment)}</Typography>
                                        </Grid>
                                        <Grid xs={6} sm={3}>
                                            <Typography level="body-xs" color="neutral">Rate</Typography>
                                            <Typography level="body-md" fontWeight="bold">
                                                {formatPercent(isEquityType ? mort.equity_loan_interest_rate : mort.interest_rate)}
                                            </Typography>
                                        </Grid>
                                        {!isEquityType ? (
                                            <>
                                                <Grid xs={6} sm={3}>
                                                    <Typography level="body-xs" color="neutral">Term</Typography>
                                                    <Typography level="body-md" fontWeight="bold">{mort.term_years} Yrs</Typography>
                                                </Grid>
                                                <Grid xs={6} sm={3}>
                                                    <Typography level="body-xs" color="neutral">Fixed Ends</Typography>
                                                    <Typography level="body-md" fontWeight="bold">{mort.fixed_rate_expiry || 'N/A'}</Typography>
                                                </Grid>
                                            </>
                                        ) : (
                                            <>
                                                <Grid xs={6} sm={3}>
                                                    <Typography level="body-xs" color="neutral">Start Date</Typography>
                                                    <Typography level="body-md" fontWeight="bold">{mort.equity_loan_start_date || 'N/A'}</Typography>
                                                </Grid>
                                                <Grid xs={6} sm={3}>
                                                    <Typography level="body-xs" color="neutral">CPI Rate</Typography>
                                                    <Typography level="body-md" fontWeight="bold">{formatPercent(mort.equity_loan_cpi_rate)}</Typography>
                                                </Grid>
                                            </>
                                        )}
                                    </Grid>

                                    {isEquityType && h2bProjections && (
                                        <Sheet variant="outlined" sx={{ mt: 3, p: 2, borderRadius: 'md', borderLeft: '4px solid', borderColor: 'warning.solidBg', overflowX: 'auto' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                                <InfoOutlined color="warning" />
                                                <Typography level="title-sm">Interest Projection (Post 5-Year Interest Free)</Typography>
                                            </Box>
                                            <Table size="sm" sx={{ '--TableCell-paddingX': '8px', minWidth: 400 }}>
                                                <thead>
                                                    <tr>
                                                        <th>Year</th>
                                                        <th>Loan Age</th>
                                                        <th>Est. Rate</th>
                                                        <th style={{ textAlign: 'right' }}>Annual Fee</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {h2bProjections.map((p, idx) => (
                                                        <tr key={idx}>
                                                            <td>{p.year}</td>
                                                            <td>Yr {p.age}</td>
                                                            <td>{p.rate}</td>
                                                            <td style={{ textAlign: 'right' }}>{p.fee > 0 ? formatCurrency(p.fee) : '£0.00'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </Table>
                                        </Sheet>
                                    )}
                                </Grid>
                            </Grid>
                        </Card>
                    </Grid>
                );
            })}
        </Grid>

        <Modal open={Boolean(editItem)} onClose={() => { setEditItem(null); setIsNew(false); }}>
            <ModalDialog sx={{ width: '100%', maxWidth: 650, maxHeight: '90vh', overflowY: 'auto' }}>
                <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'flex-start' }}>
                    <Box sx={{ position: 'relative' }}>
                        <Avatar 
                            size="lg" 
                            sx={{ '--Avatar-size': '64px', bgcolor: getEmojiColor(selectedEmoji, isDark), fontSize: '2rem', cursor: 'pointer' }}
                            onClick={() => setEmojiPicker(true)}
                        >
                            {selectedEmoji}
                        </Avatar>
                        <IconButton 
                            size="sm" variant="solid" color="primary" 
                            sx={{ position: 'absolute', bottom: -4, right: -4, borderRadius: '50%', border: '2px solid', borderColor: 'background.surface' }}
                            onClick={() => setEmojiPicker(true)}
                        ><Edit sx={{ fontSize: '0.8rem' }} /></IconButton>
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                        <DialogTitle>{isNew ? (activeType === 'equity' ? 'Add Equity Loan' : 'Add Mortgage') : 'Edit Details'}</DialogTitle>
                        <Typography level="body-sm" color="neutral">Provide details for this property-secured debt.</Typography>
                    </Box>
                </Box>
                
                <DialogContent>
                    <form onSubmit={handleSubmit}>
                        <input type="hidden" name="emoji" value={selectedEmoji} />
                        <Stack spacing={2}>
                            <Grid container spacing={2}>
                                <Grid xs={12} md={6}>
                                    <FormControl required><FormLabel>Lender</FormLabel><Input name="lender" defaultValue={editItem?.lender} /></FormControl>
                                </Grid>
                                <Grid xs={12} md={6}>
                                    <FormControl required><FormLabel>Property Address</FormLabel><Input name="property_address" defaultValue={editItem?.property_address} /></FormControl>
                                </Grid>
                                <Grid xs={12} md={6}>
                                    <FormControl required><FormLabel>Estimated Property Value (£)</FormLabel><Input name="estimated_value" type="number" step="0.01" defaultValue={editItem?.estimated_value} /></FormControl>
                                </Grid>
                                {activeType === 'mortgage' && (
                                    <Grid xs={12} md={6}>
                                        <FormControl><FormLabel>Other Secured Debt (£)</FormLabel><Input name="other_secured_debt" type="number" step="0.01" defaultValue={editItem?.other_secured_debt} /></FormControl>
                                    </Grid>
                                )}
                            </Grid>

                            {activeType === 'mortgage' ? (
                                <>
                                    <Divider><Chip variant="soft" size="sm">MORTGAGE DETAILS</Chip></Divider>
                                    <Grid container spacing={2}>
                                        <Grid xs={12} md={4}>
                                            <FormControl required><FormLabel>Total Loan (£)</FormLabel><Input name="total_amount" type="number" step="0.01" defaultValue={editItem?.total_amount} /></FormControl>
                                        </Grid>
                                        <Grid xs={12} md={4}>
                                            <FormControl required><FormLabel>Remaining Balance (£)</FormLabel><Input name="remaining_balance" type="number" step="0.01" defaultValue={editItem?.remaining_balance} /></FormControl>
                                        </Grid>
                                        <Grid xs={12} md={4}>
                                            <FormControl required><FormLabel>Interest Rate (%)</FormLabel><Input name="interest_rate" type="number" step="0.01" defaultValue={editItem?.interest_rate} /></FormControl>
                                        </Grid>
                                        <Grid xs={12} md={4}>
                                            <FormControl><FormLabel>Monthly Payment (£)</FormLabel><Input name="monthly_payment" type="number" step="0.01" defaultValue={editItem?.monthly_payment} /></FormControl>
                                        </Grid>
                                        <Grid xs={12} md={4}>
                                            <FormControl><FormLabel>Term (Years)</FormLabel><Input name="term_years" type="number" defaultValue={editItem?.term_years} /></FormControl>
                                        </Grid>
                                        <Grid xs={12} md={4}>
                                            <FormControl><FormLabel>Fixed Ends</FormLabel><Input name="fixed_rate_expiry" type="date" defaultValue={editItem?.fixed_rate_expiry} /></FormControl>
                                        </Grid>
                                        <Grid xs={12} md={4}>
                                            <FormControl><FormLabel>Payment Day</FormLabel><Input name="payment_day" type="number" min="1" max="31" defaultValue={editItem?.payment_day} placeholder="e.g. 1" /></FormControl>
                                        </Grid>
                                        <Grid xs={12}>
                                            <AppSelect 
                                                label="Repayment Type"
                                                name="repayment_type"
                                                defaultValue={editItem?.repayment_type || 'Repayment'}
                                                options={[
                                                    { value: 'Repayment', label: 'Capital & Interest (Repayment)' },
                                                    { value: 'Interest Only', label: 'Interest Only' }
                                                ]}
                                            />
                                        </Grid>
                                    </Grid>
                                </>
                            ) : (
                                <>
                                    <Divider><Chip variant="soft" color="warning" size="sm">EQUITY LOAN DETAILS</Chip></Divider>
                                    <Grid container spacing={2}>
                                        <Grid xs={12} md={6}>
                                            <FormControl required><FormLabel>Loan Amount (£)</FormLabel><Input name="equity_loan_amount" type="number" step="0.01" defaultValue={editItem?.equity_loan_amount} /></FormControl>
                                        </Grid>
                                        <Grid xs={12} md={6}>
                                            <FormControl required><FormLabel>Start Date</FormLabel><Input name="equity_loan_start_date" type="date" defaultValue={editItem?.equity_loan_start_date} /></FormControl>
                                        </Grid>
                                        <Grid xs={12} md={6}>
                                            <FormControl><FormLabel>Fee Rate After 5yr (%)</FormLabel><Input name="equity_loan_interest_rate" type="number" step="0.01" defaultValue={editItem?.equity_loan_interest_rate || 1.75} /></FormControl>
                                        </Grid>
                                        <Grid xs={12} md={6}>
                                            <FormControl><FormLabel>Estimated CPI (%)</FormLabel><Input name="equity_loan_cpi_rate" type="number" step="0.01" defaultValue={editItem?.equity_loan_cpi_rate || 2.0} /></FormControl>
                                        </Grid>
                                        <Grid xs={12} md={6}>
                                            <FormControl><FormLabel>Monthly Payment (£)</FormLabel><Input name="monthly_payment" type="number" step="0.01" defaultValue={editItem?.monthly_payment} /></FormControl>
                                        </Grid>
                                    </Grid>
                                </>
                            )}

                            <FormControl><FormLabel>Assign Borrowers / Owners</FormLabel>
                                <AppSelect 
                                    name="selected_members_dummy"
                                    multiple
                                    value={selectedMembers}
                                    onChange={(val) => setSelectedMembers(val)}
                                    options={members.filter(m => m.type !== 'pet').map(m => ({ value: m.id, label: `${m.emoji} ${m.name}` }))}
                                    placeholder="Select members..."
                                />
                            </FormControl>
                        </Stack>
                        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
                            {!isNew && <Button color="danger" variant="soft" onClick={() => { handleDelete(editItem.id); setEditItem(null); }}>Delete</Button>}
                            <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
                                <Button variant="plain" color="neutral" onClick={() => { setEditItem(null); setIsNew(false); }}>Cancel</Button>
                                <Button type="submit" color="primary">Save {activeType === 'equity' ? 'Equity Loan' : 'Mortgage'}</Button>
                            </Box>
                        </Box>
                    </form>
                </DialogContent>
            </ModalDialog>
        </Modal>

        <Modal open={Boolean(assignItem)} onClose={() => setAssignItem(null)}>
            <ModalDialog size="sm">
                <DialogTitle>Assign Borrowers</DialogTitle>
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