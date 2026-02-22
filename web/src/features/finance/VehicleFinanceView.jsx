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
  LinearProgress,
  Checkbox,
  IconButton,
} from '@mui/joy';
import { Add, Edit } from '@mui/icons-material';
import { getEmojiColor } from '../../theme';
import EmojiPicker from '../../components/EmojiPicker';
import AppSelect from '../../components/ui/AppSelect';
import ModuleHeader from '../../components/ui/ModuleHeader';
import FinanceCard from '../../components/ui/FinanceCard';

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

export default function VehicleFinanceView({ financialProfileId }) {
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
  const selectedFinanceId = queryParams.get('selectedFinanceId');

  const [finances, setFinances] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [assignItem, setAssignItem] = useState(null);
  const [emojiPicker, setEmojiPicker] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState('🚗');
  const [selectedMembers, setSelectedMembers] = useState([]);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'member';

  const getAssignees = useCallback(
    (itemId) =>
      assignments
        .filter((a) => a.entity_id === itemId)
        .map((a) => members.find((m) => m.id === a.member_id))
        .filter(Boolean),
    [assignments, members]
  );

  const selectedFinance = useMemo(
    () => finances.find((f) => String(f.id) === String(selectedFinanceId)),
    [finances, selectedFinanceId]
  );

  useEffect(() => {
    if (selectedFinance) {
      setSelectedEmoji(selectedFinance.emoji || '🚗');
      setSelectedMembers(getAssignees(selectedFinance.id).map((m) => m.id));
    } else if (selectedFinanceId === 'new') {
      setSelectedEmoji('🚗');
      const defaultMember = members.find((m) => m.type !== 'pet');
      setSelectedMembers(defaultMember ? [defaultMember.id] : []);
    }
  }, [selectedFinance, selectedFinanceId, getAssignees, currentUser?.id, members]);

  const fetchData = useCallback(async () => {
    if (!financialProfileId) return;
    setLoading(true);
    try {
      const [res, vRes, assRes] = await Promise.all([
        api.get(
          `/households/${householdId}/finance/vehicle-finance?financial_profile_id=${financialProfileId}`
        ),
        api.get(`/households/${householdId}/vehicles`),
        api.get(`/households/${householdId}/finance/assignments?entity_type=vehicle_finance`),
      ]);
      setFinances(res.data || []);
      setVehicles(vRes.data || []);
      setAssignments(assRes.data || []);
    } catch (err) {
      console.error('Failed to fetch car finance', err);
    } finally {
      setLoading(false);
    }
  }, [api, householdId, financialProfileId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const setFinanceId = (id) => {
    const newParams = new URLSearchParams(location.search);
    if (id) newParams.set('selectedFinanceId', id);
    else newParams.delete('selectedFinanceId');
    navigate(`?${newParams.toString()}`, { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    data.emoji = selectedEmoji;
    data.financial_profile_id = financialProfileId;
    try {
      let itemId = selectedFinanceId;
      if (selectedFinanceId === 'new') {
        const res = await api.post(`/households/${householdId}/finance/vehicle-finance`, data);
        itemId = res.data.id;
        showNotification('Finance agreement added.', 'success');
      } else {
        await api.put(`/households/${householdId}/finance/vehicle-finance/${itemId}`, data);
        showNotification('Finance agreement updated.', 'success');
      }
      const currentIds = selectedFinanceId === 'new' ? [] : getAssignees(itemId).map((m) => m.id);
      const toAdd = selectedMembers.filter((id) => !currentIds.includes(id));
      await Promise.all(
        toAdd.map((mid) =>
          api.post(`/households/${householdId}/finance/assignments`, {
            entity_type: 'vehicle_finance',
            entity_id: itemId,
            member_id: mid,
          })
        )
      );
      const toRemove = currentIds.filter((id) => !selectedMembers.includes(id));
      await Promise.all(
        toRemove.map((mid) =>
          api.delete(
            `/households/${householdId}/finance/assignments/vehicle_finance/${itemId}/${mid}`
          )
        )
      );

      await fetchData();
      setFinanceId(null);
    } catch (err) {
      showNotification('Failed to save: ' + err.message, 'danger');
    }
  };

  const handleDelete = async (id) => {
    confirmAction(
      'Delete Agreement',
      'Are you sure you want to delete this finance agreement? This cannot be undone.',
      async () => {
        try {
          await api.delete(`/households/${householdId}/finance/vehicle-finance/${id}`);
          showNotification('Agreement deleted', 'success');
          fetchData();
          if (selectedFinanceId === String(id)) setFinanceId(null);
        } catch {
          showNotification('Failed to delete', 'danger');
        }
      }
    );
  };

  const handleAssignMember = async (memberId) => {
    try {
      await api.post(`/households/${householdId}/finance/assignments`, {
        entity_type: 'vehicle_finance',
        entity_id: assignItem.id,
        member_id: memberId,
      });
      const assRes = await api.get(
        `/households/${householdId}/finance/assignments?entity_type=vehicle_finance`
      );
      setAssignments(assRes.data || []);
    } catch (err) {
      console.error('Assignment failed', err);
    }
  };

  const handleUnassignMember = async (memberId) => {
    try {
      await api.delete(
        `/households/${householdId}/finance/assignments/vehicle_finance/${assignItem.id}/${memberId}`
      );
      const assRes = await api.get(
        `/households/${householdId}/finance/assignments?entity_type=vehicle_finance`
      );
      setAssignments(assRes.data || []);
    } catch (err) {
      console.error('Removal failed', err);
    }
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
        title="Car Finance"
        description="Track loans and leases for your fleet."
        emoji="🚗"
        isDark={isDark}
        action={
          isAdmin && (
            <Button
              variant="solid"
              startDecorator={<Add />}
              onClick={() => setFinanceId('new')}
              sx={{ height: '44px' }}
            >
              Add Agreement
            </Button>
          )
        }
      />

      <Grid container spacing={3}>
        {finances.map((fin) => {
          const vehicle = vehicles.find((v) => v.id === fin.vehicle_id);
          const total = parseFloat(fin.total_amount) || 0;
          const remaining = parseFloat(fin.remaining_balance) || 0;
          const progress = total > 0 ? ((total - remaining) / total) * 100 : 0;

          return (
            <Grid xs={12} lg={6} xl={4} key={fin.id}>
              <FinanceCard
                title={fin.provider}
                subtitle={vehicle ? `${vehicle.make} ${vehicle.model}` : 'Unlinked Vehicle'}
                emoji={fin.emoji || '🚗'}
                isDark={isDark}
                balance={remaining}
                balanceColor="danger"
                subValue={`of ${formatCurrency(total)}`}
                assignees={getAssignees(fin.id)}
                onAssign={() => setAssignItem(fin)}
                onEdit={() => setFinanceId(fin.id)}
                onDelete={() => handleDelete(fin.id)}
              >
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography level="body-xs">Payoff Progress</Typography>
                    <Typography level="body-xs" fontWeight="bold">
                      {progress.toFixed(2)}%
                    </Typography>
                  </Box>
                  <LinearProgress determinate value={Math.min(progress, 100)} color="success" />
                </Box>

                <Grid container spacing={1} sx={{ mt: 1 }}>
                  <Grid xs={6}>
                    <Typography level="body-xs" color="neutral">
                      Monthly Payment
                    </Typography>
                    <Typography level="body-sm">{formatCurrency(fin.monthly_payment)}</Typography>
                  </Grid>
                  <Grid xs={6}>
                    <Typography level="body-xs" color="neutral">
                      Interest Rate
                    </Typography>
                    <Typography level="body-sm">{formatPercent(fin.interest_rate)}</Typography>
                  </Grid>
                </Grid>
              </FinanceCard>
            </Grid>
          );
        })}
      </Grid>

      <Modal open={Boolean(selectedFinanceId)} onClose={() => setFinanceId(null)}>
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
                onClick={() => setEmojiPicker(true)}
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
                onClick={() => setEmojiPicker(true)}
              >
                <Edit sx={{ fontSize: '0.8rem' }} />
              </IconButton>
            </Box>
            <Box sx={{ flexGrow: 1 }}>
              <DialogTitle>
                {selectedFinanceId === 'new' ? 'Add Car Finance' : 'Edit Agreement'}
              </DialogTitle>
              <Typography level="body-sm" color="neutral">
                Track loans and leases for your fleet.
              </Typography>
            </Box>
          </Box>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <Stack spacing={2} sx={{ mt: 1 }}>
                <FormControl required>
                  <FormLabel>Vehicle</FormLabel>
                  <AppSelect
                    name="vehicle_id"
                    defaultValue={String(selectedFinance?.vehicle_id || '')}
                    options={vehicles.map((v) => ({
                      value: String(v.id),
                      label: `${v.emoji} ${v.make} ${v.model} (${v.registration})`,
                    }))}
                    placeholder="Select Vehicle"
                  />
                </FormControl>
                <FormControl required>
                  <FormLabel>Provider</FormLabel>
                  <Input
                    name="provider"
                    defaultValue={selectedFinance?.provider}
                    placeholder="e.g. VW Finance"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Account Number</FormLabel>
                  <Input name="account_number" defaultValue={selectedFinance?.account_number} />
                </FormControl>
                <Grid container spacing={2}>
                  <Grid xs={6}>
                    <FormControl required>
                      <FormLabel>Total Amount (£)</FormLabel>
                      <Input
                        name="total_amount"
                        type="number"
                        slotProps={{ input: { step: 'any' } }}
                        defaultValue={selectedFinance?.total_amount}
                      />
                    </FormControl>
                  </Grid>
                  <Grid xs={6}>
                    <FormControl required>
                      <FormLabel>Remaining Balance (£)</FormLabel>
                      <Input
                        name="remaining_balance"
                        type="number"
                        slotProps={{ input: { step: 'any' } }}
                        defaultValue={selectedFinance?.remaining_balance}
                      />
                    </FormControl>
                  </Grid>
                  <Grid xs={6}>
                    <FormControl>
                      <FormLabel>Interest Rate (%)</FormLabel>
                      <Input
                        name="interest_rate"
                        type="number"
                        slotProps={{ input: { step: 'any' } }}
                        defaultValue={selectedFinance?.interest_rate}
                      />
                    </FormControl>
                  </Grid>
                  <Grid xs={6}>
                    <FormControl>
                      <FormLabel>Monthly Payment (£)</FormLabel>
                      <Input
                        name="monthly_payment"
                        type="number"
                        slotProps={{ input: { step: 'any' } }}
                        defaultValue={selectedFinance?.monthly_payment}
                      />
                    </FormControl>
                  </Grid>
                  <Grid xs={6}>
                    <FormControl>
                      <FormLabel>Start Date</FormLabel>
                      <Input
                        name="start_date"
                        type="date"
                        defaultValue={selectedFinance?.start_date}
                      />
                    </FormControl>
                  </Grid>
                  <Grid xs={6}>
                    <FormControl>
                      <FormLabel>End Date</FormLabel>
                      <Input name="end_date" type="date" defaultValue={selectedFinance?.end_date} />
                    </FormControl>
                  </Grid>
                  <Grid xs={6}>
                    <FormControl required>
                      <FormLabel>Payment Day</FormLabel>
                      <Input
                        name="payment_day"
                        type="number"
                        min="1"
                        max="31"
                        defaultValue={selectedFinance?.payment_day}
                      />
                    </FormControl>
                  </Grid>
                  <Grid xs={6} sx={{ display: 'flex', alignItems: 'center' }}>
                    <Checkbox
                      label="Nearest Working Day (Next)"
                      name="nearest_working_day"
                      defaultChecked={selectedFinance?.nearest_working_day !== 0}
                      value="1"
                      sx={{ mt: 3 }}
                    />
                  </Grid>
                </Grid>
                <FormControl>
                  <FormLabel>Assign Members</FormLabel>
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
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
                {selectedFinanceId !== 'new' && (
                  <Button
                    color="danger"
                    variant="soft"
                    onClick={() => {
                      handleDelete(selectedFinance.id);
                    }}
                  >
                    Delete
                  </Button>
                )}
                <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
                  <Button variant="plain" color="neutral" onClick={() => setFinanceId(null)}>
                    Cancel
                  </Button>
                  <Button type="submit">Save</Button>
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
        open={emojiPicker}
        onClose={() => setEmojiPicker(false)}
        onEmojiSelect={(emoji) => {
          setSelectedEmoji(emoji);
          setEmojiPicker(false);
        }}
        isDark={isDark}
      />
    </Box>
  );
}
