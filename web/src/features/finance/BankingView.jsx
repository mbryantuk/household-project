import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext, useLocation, useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Grid, Card, Avatar, IconButton, 
  Button, Modal, ModalDialog, DialogTitle, DialogContent, DialogActions, Input,
  FormControl, FormLabel, Stack, Chip, CircularProgress, Divider,
  Sheet, Table, AvatarGroup
} from '@mui/joy';
import { Edit, Delete, Add, GroupAdd } from '@mui/icons-material';
import { getEmojiColor } from '../../theme';
import EmojiPicker from '../../components/EmojiPicker';

const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return num.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function BankingView({ financialProfileId }) {
  const { api, id: householdId, user: currentUser, isDark, members, showNotification } = useOutletContext();
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const selectedAccountId = queryParams.get('selectedAccountId');

  const [accounts, setAccounts] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignItem, setAssignItem] = useState(null); 
  
  // Emoji State
  const [emojiPicker, setEmojiPicker] = useState({ open: false, type: null });
  const [selectedEmoji, setSelectedEmoji] = useState('💰');

  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'member';

  const getAssignees = useCallback((accountId) => {
      return assignments.filter(a => a.entity_id === accountId).map(a => {
          return members.find(m => m.id === a.member_id);
      }).filter(Boolean);
  }, [assignments, members]);

  const fetchData = useCallback(async () => {
    if (!financialProfileId) return;
    setLoading(true);
    try {
      const [accRes, assRes] = await Promise.all([
          api.get(`/households/${householdId}/finance/current-accounts?financial_profile_id=${financialProfileId}`),
          api.get(`/households/${householdId}/finance/assignments?entity_type=current_account`)
      ]);
      setAccounts(accRes.data || []);
      setAssignments(assRes.data || []);
    } catch (err) {
      console.error("Failed to fetch banking data", err);
    } finally {
      setLoading(false);
    }
  }, [api, householdId, financialProfileId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectedAccount = useMemo(() => 
    accounts.find(a => String(a.id) === String(selectedAccountId)),
  [accounts, selectedAccountId]);

  const setAccountId = (id) => {
    const newParams = new URLSearchParams(location.search);
    if (id) newParams.set('selectedAccountId', id);
    else newParams.delete('selectedAccountId');
    navigate(`?${newParams.toString()}`, { replace: true });
  };

  const [selectedMembers, setSelectedMembers] = useState([]);

  useEffect(() => {
      if (selectedAccount) {
          setSelectedMembers(getAssignees(selectedAccount.id).map(m => m.id));
          setSelectedEmoji(selectedAccount.emoji || '💰');
      } else if (selectedAccountId === 'new') {
          // Default to current user or first adult
          const defaultMember = members.find(m => m.id === currentUser?.id) || members.find(m => m.type !== 'pet');
          setSelectedMembers(defaultMember ? [defaultMember.id] : []);
          setSelectedEmoji('💰');
      }
  }, [selectedAccount, selectedAccountId, getAssignees, members, currentUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    data.emoji = selectedEmoji;
    data.financial_profile_id = financialProfileId;

    try {
      let itemId = selectedAccountId;
      if (selectedAccountId === 'new') {
        const res = await api.post(`/households/${householdId}/finance/current-accounts`, data);
        itemId = res.data.id;
        showNotification("Account added.", "success");
      } else {
        await api.put(`/households/${householdId}/finance/current-accounts/${selectedAccountId}`, data);
        showNotification("Account updated.", "success");
      }

      // Handle Assignments
      const currentIds = selectedAccountId === 'new' ? [] : getAssignees(itemId).map(m => m.id);
      const toAdd = selectedMembers.filter(id => !currentIds.includes(id));
      const toRemove = currentIds.filter(id => !selectedMembers.includes(id));

      await Promise.all([
          ...toAdd.map(mid => api.post(`/households/${householdId}/finance/assignments`, { entity_type: 'current_account', entity_id: itemId, member_id: mid })),
          ...toRemove.map(mid => api.delete(`/households/${householdId}/finance/assignments/current_account/${itemId}/${mid}`))
      ]);

      await fetchData();
      setAccountId(null);
    } catch (err) {
      console.error("BankingView Save Error:", err);
      showNotification("Failed to save account", "danger");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this account permanently?")) return;
    try {
      await api.delete(`/households/${householdId}/finance/current-accounts/${id}`);
      fetchData();
      if (selectedAccountId === String(id)) setAccountId(null);
    } catch {
      alert("Failed to delete account");
    }
  };

  // Assignment Logic
  const handleAssignMember = async (memberId) => {
      try {
          await api.post(`/households/${householdId}/finance/assignments`, {
              entity_type: 'current_account',
              entity_id: assignItem.id,
              member_id: memberId
          });
          // Refresh assignments only
          const assRes = await api.get(`/households/${householdId}/finance/assignments?entity_type=current_account`);
          setAssignments(assRes.data || []);
      } catch (err) { console.error("Assignment failed", err); }
  };

  const handleUnassignMember = async (memberId) => {
      try {
          await api.delete(`/households/${householdId}/finance/assignments/current_account/${assignItem.id}/${memberId}`);
          // Refresh assignments only
          const assRes = await api.get(`/households/${householdId}/finance/assignments?entity_type=current_account`);
          setAssignments(assRes.data || []);
      } catch (err) { console.error("Removal failed", err); }
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
              Current Accounts
            </Typography>
            <Typography level="body-md" color="neutral">
              Track balances, overdrafts, and account holders.
            </Typography>
          </Box>
          
          {isAdmin && (
              <Button variant="solid" startDecorator={<Add />} onClick={() => setAccountId('new')}>
                  Add Account
              </Button>
          )}
        </Box>

      {!isMobile ? (
        <Sheet variant="outlined" sx={{ borderRadius: 'sm', overflow: 'auto', flexGrow: 1 }}>
            <Table hoverRow stickyHeader>
                <thead>
                    <tr>
                        <th style={{ width: 50 }}></th>
                        <th>Bank / Name</th>
                        <th>Sort Code</th>
                        <th>Account No.</th>
                        <th>Overdraft</th>
                        <th>Balance</th>
                        <th>Holders</th>
                        {isAdmin && <th style={{ textAlign: 'right', width: 120 }}>Actions</th>}
                    </tr>
                </thead>
                <tbody>
                    {accounts.map((row) => (
                        <tr key={row.id}>
                            <td>
                                <Avatar size="sm" sx={{ bgcolor: getEmojiColor(row.emoji || (row.bank_name||'?')[0], isDark) }}>
                                    {row.emoji || (row.bank_name||'?')[0]}
                                </Avatar>
                            </td>
                            <td>
                                <Typography level="body-md" sx={{ fontWeight: 'lg' }}>{row.bank_name}</Typography>
                                <Typography level="body-xs" color="neutral">{row.account_name}</Typography>
                            </td>
                            <td>{row.sort_code || '??-??-??'}</td>
                            <td>{row.account_number ? `•••• ${row.account_number.slice(-4)}` : '••••'}</td>
                            <td>{row.overdraft_limit ? formatCurrency(row.overdraft_limit) : '-'}</td>
                            <td>
                                <Typography fontWeight="bold" color={row.current_balance < 0 ? 'danger' : 'success'}>
                                    {formatCurrency(row.current_balance)}
                                </Typography>
                            </td>
                            <td>
                                <AvatarGroup size="sm" sx={{ '--AvatarGroup-gap': '-4px' }}>
                                    {getAssignees(row.id).map(m => (
                                        <Avatar key={m.id} sx={{ bgcolor: getEmojiColor(m.emoji, isDark) }}>{m.emoji || m.name[0]}</Avatar>
                                    ))}
                                    {isAdmin && (
                                        <IconButton size="sm" onClick={() => setAssignItem(row)} sx={{ borderRadius: '50%' }}><GroupAdd fontSize="small" /></IconButton>
                                    )}
                                </AvatarGroup>
                            </td>
                            {isAdmin && (
                                <td style={{ textAlign: 'right' }}>
                                    <IconButton size="sm" variant="plain" onClick={() => setAccountId(row.id)}><Edit /></IconButton>
                                    <IconButton size="sm" variant="plain" color="danger" onClick={() => handleDelete(row.id)}><Delete /></IconButton>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </Table>
        </Sheet>
      ) : (
        <Grid container spacing={2}>
            {accounts.map(a => (
            <Grid xs={12} key={a.id}>
                <Card variant="outlined" sx={{ flexDirection: 'row', gap: 2 }}>
                    <Avatar size="lg" sx={{ bgcolor: getEmojiColor(a.emoji || (a.bank_name||'?')[0], isDark) }}>
                        {a.emoji || (a.bank_name||'?')[0]}
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                        <Typography level="title-md" sx={{ fontWeight: 'lg' }}>{a.bank_name}</Typography>
                        <Typography level="body-sm">{a.account_name}</Typography>
                        <Typography level="body-xs" fontWeight="bold">{formatCurrency(a.current_balance)}</Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                             {getAssignees(a.id).map(m => (
                                <Chip key={m.id} size="sm" variant="soft">{m.alias || m.name}</Chip>
                            ))}
                            <IconButton size="sm" onClick={() => setAssignItem(a)}><GroupAdd /></IconButton>
                        </Box>
                    </Box>
                    <IconButton variant="plain" onClick={() => setAccountId(a.id)}>
                        <Edit />
                    </IconButton>
                </Card>
            </Grid>
            ))}
        </Grid>
      )}

      {/* EDIT MODAL */}
      <Modal open={Boolean(selectedAccountId)} onClose={() => setAccountId(null)}>
        <ModalDialog sx={{ maxWidth: 600, width: '100%', maxHeight: '95vh', overflowY: 'auto' }}>
            <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'flex-start' }}>
                <Box sx={{ position: 'relative' }}>
                    <Avatar size="lg" sx={{ '--Avatar-size': '64px', bgcolor: getEmojiColor(selectedEmoji, isDark), fontSize: '2rem', cursor: 'pointer' }} onClick={() => setEmojiPicker({ open: true, type: 'account' })}>{selectedEmoji}</Avatar>
                    <IconButton size="sm" variant="solid" color="primary" sx={{ position: 'absolute', bottom: -4, right: -4, borderRadius: '50%', border: '2px solid', borderColor: 'background.surface' }} onClick={() => setEmojiPicker({ open: true, type: 'account' })}><Edit sx={{ fontSize: '0.8rem' }} /></IconButton>
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                    <DialogTitle>{selectedAccountId === 'new' ? 'Add Bank Account' : `Edit ${selectedAccount?.bank_name}`}</DialogTitle>
                    <Typography level="body-sm" color="neutral">Track balances, overdrafts, and account holders.</Typography>
                </Box>
            </Box>
            <DialogContent sx={{ overflowX: 'hidden' }}>
                <form onSubmit={handleSubmit}>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid xs={12} md={6}>
                            <FormControl required>
                                <FormLabel>Bank Name</FormLabel>
                                <Input name="bank_name" defaultValue={selectedAccount?.bank_name} placeholder="e.g. HSBC" />
                            </FormControl>
                        </Grid>
                        <Grid xs={12} md={6}>
                            <FormControl>
                                <FormLabel>Account Name/Type</FormLabel>
                                <Input name="account_name" defaultValue={selectedAccount?.account_name} placeholder="e.g. Joint Current" />
                            </FormControl>
                        </Grid>
                        
                        <Grid xs={12}><Divider>Details</Divider></Grid>

                        <Grid xs={6}>
                            <FormControl>
                                <FormLabel>Sort Code</FormLabel>
                                <Input name="sort_code" defaultValue={selectedAccount?.sort_code} placeholder="00-00-00" />
                            </FormControl>
                        </Grid>
                        <Grid xs={6}>
                            <FormControl>
                                <FormLabel>Account Number</FormLabel>
                                <Input name="account_number" defaultValue={selectedAccount?.account_number} placeholder="8 digits" />
                            </FormControl>
                        </Grid>

                        <Grid xs={6}>
                            <FormControl>
                                <FormLabel>Current Balance (£)</FormLabel>
                                <Input name="current_balance" type="number" slotProps={{ input: { step: 'any' } }} defaultValue={selectedAccount?.current_balance} />
                            </FormControl>
                        </Grid>
                        <Grid xs={6}>
                            <FormControl>
                                <FormLabel>Overdraft Limit (£)</FormLabel>
                                <Input name="overdraft_limit" type="number" slotProps={{ input: { step: 'any' } }} defaultValue={selectedAccount?.overdraft_limit} />
                            </FormControl>
                        </Grid>

                        <Grid xs={12}>
                            <FormControl>
                                <FormLabel>Notes</FormLabel>
                                <Input name="notes" defaultValue={selectedAccount?.notes} />
                            </FormControl>
                        </Grid>

                        <Grid xs={12}>
                            <FormControl>
                                <FormLabel>Assign Account Holders</FormLabel>
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
                    <DialogActions sx={{ mt: 2 }}>
                        <Button variant="plain" color="neutral" onClick={() => setAccountId(null)}>Cancel</Button>
                        <Button type="submit" variant="solid">Save Account</Button>
                    </DialogActions>
                </form>
            </DialogContent>
        </ModalDialog>
      </Modal>

      {/* ASSIGNMENT MODAL */}
      <Modal open={Boolean(assignItem)} onClose={() => setAssignItem(null)}>
        <ModalDialog size="sm">
            <DialogTitle>Manage Account Holders</DialogTitle>
            <DialogContent>
                <Typography level="body-sm" sx={{ mb: 2 }}>Who has access to {assignItem?.bank_name}?</Typography>
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
        onEmojiSelect={(emoji) => { setSelectedEmoji(emoji); setEmojiPicker({ ...emojiPicker, open: false }); }} 
        isDark={isDark} 
      />
    </Box>
  );
}
