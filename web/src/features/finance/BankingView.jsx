import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Grid, Card, Avatar, IconButton, 
  Button, Modal, ModalDialog, DialogTitle, DialogContent, DialogActions, Input,
  FormControl, FormLabel, Stack, Chip, CircularProgress, Divider,
  Sheet, Table, AvatarGroup
} from '@mui/joy';
import { Edit, Delete, Add, GroupAdd } from '@mui/icons-material';
import { getEmojiColor } from '../../theme';
import AppSelect from '../../components/ui/AppSelect';

export default function BankingView() {
  const { api, id: householdId, user: currentUser, isDark, members } = useOutletContext();
  const [accounts, setAccounts] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState(null);
  const [assignItem, setAssignItem] = useState(null); // Item being assigned
  const [isNew, setIsNew] = useState(false);
  
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
      const [accRes, assRes] = await Promise.all([
          api.get(`/households/${householdId}/finance/current-accounts`),
          api.get(`/households/${householdId}/finance/assignments?entity_type=current_account`)
      ]);
      setAccounts(accRes.data || []);
      setAssignments(assRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [api, householdId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      if (isNew) {
        await api.post(`/households/${householdId}/finance/current-accounts`, data);
      } else {
        await api.put(`/households/${householdId}/finance/current-accounts/${editItem.id}`, data);
      }
      fetchData();
      setEditItem(null);
      setIsNew(false);
    } catch (err) {
      alert("Failed to save");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this account permanently?")) return;
    try {
      await api.delete(`/households/${householdId}/finance/current-accounts/${id}`);
      fetchData();
    } catch (err) {
      alert("Failed to delete");
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
      } catch (err) { console.error(err); }
  };

  const handleUnassignMember = async (memberId) => {
      try {
          await api.delete(`/households/${householdId}/finance/assignments/current_account/${assignItem.id}/${memberId}`);
          // Refresh assignments only
          const assRes = await api.get(`/households/${householdId}/finance/assignments?entity_type=current_account`);
          setAssignments(assRes.data || []);
      } catch (err) { console.error(err); }
  };

  const getAssignees = (accountId) => {
      return assignments.filter(a => a.entity_id === accountId).map(a => {
          return members.find(m => m.id === a.member_id);
      }).filter(Boolean);
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
              <Button variant="solid" startDecorator={<Add />} onClick={() => { setEditItem({}); setIsNew(true); }}>
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
                            <td>{row.overdraft_limit ? `£${row.overdraft_limit}` : '-'}</td>
                            <td>
                                <Typography fontWeight="bold" color={row.current_balance < 0 ? 'danger' : 'success'}>
                                    £{row.current_balance?.toLocaleString()}
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
                                    <IconButton size="sm" variant="plain" onClick={() => { setEditItem(row); setIsNew(false); }}><Edit /></IconButton>
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
                        <Typography level="body-xs" fontWeight="bold">£{a.current_balance}</Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                             {getAssignees(a.id).map(m => (
                                <Chip key={m.id} size="sm" variant="soft">{m.alias || m.name}</Chip>
                            ))}
                            <IconButton size="sm" onClick={() => setAssignItem(a)}><GroupAdd /></IconButton>
                        </Box>
                    </Box>
                    <IconButton variant="plain" onClick={() => { setEditItem(a); setIsNew(false); }}>
                        <Edit />
                    </IconButton>
                </Card>
            </Grid>
            ))}
        </Grid>
      )}

      {/* EDIT MODAL */}
      <Modal open={Boolean(editItem)} onClose={() => setEditItem(null)}>
        <ModalDialog sx={{ maxWidth: 600, width: '100%', overflowY: 'auto' }}>
            <DialogTitle>{isNew ? 'Add Bank Account' : `Edit ${editItem?.bank_name}`}</DialogTitle>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid xs={12} md={6}>
                            <FormControl required>
                                <FormLabel>Bank Name</FormLabel>
                                <Input name="bank_name" defaultValue={editItem?.bank_name} placeholder="e.g. HSBC" />
                            </FormControl>
                        </Grid>
                        <Grid xs={12} md={6}>
                            <FormControl>
                                <FormLabel>Account Name/Type</FormLabel>
                                <Input name="account_name" defaultValue={editItem?.account_name} placeholder="e.g. Joint Current" />
                            </FormControl>
                        </Grid>
                        
                        <Grid xs={12}><Divider>Details</Divider></Grid>

                        <Grid xs={6}>
                            <FormControl>
                                <FormLabel>Sort Code</FormLabel>
                                <Input name="sort_code" defaultValue={editItem?.sort_code} placeholder="00-00-00" />
                            </FormControl>
                        </Grid>
                        <Grid xs={6}>
                            <FormControl>
                                <FormLabel>Account Number</FormLabel>
                                <Input name="account_number" defaultValue={editItem?.account_number} placeholder="8 digits" />
                            </FormControl>
                        </Grid>

                        <Grid xs={6}>
                            <FormControl>
                                <FormLabel>Current Balance (£)</FormLabel>
                                <Input name="current_balance" type="number" defaultValue={editItem?.current_balance} />
                            </FormControl>
                        </Grid>
                        <Grid xs={6}>
                            <FormControl>
                                <FormLabel>Overdraft Limit (£)</FormLabel>
                                <Input name="overdraft_limit" type="number" defaultValue={editItem?.overdraft_limit} />
                            </FormControl>
                        </Grid>

                        <Grid xs={12}>
                            <FormControl>
                                <FormLabel>Notes</FormLabel>
                                <Input name="notes" defaultValue={editItem?.notes} />
                            </FormControl>
                        </Grid>
                    </Grid>
                    <DialogActions>
                        <Button variant="plain" color="neutral" onClick={() => setEditItem(null)}>Cancel</Button>
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
    </Box>
  );
}
