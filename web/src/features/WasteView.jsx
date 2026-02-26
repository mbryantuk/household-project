import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  Avatar,
  IconButton,
  Button,
  Modal,
  ModalDialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Input,
  FormControl,
  FormLabel,
  Select,
  Option,
  Stack,
  CircularProgress,
  Checkbox,
} from '@mui/joy';
import { Edit, Delete, DeleteSweep, Add } from '@mui/icons-material';
import { getEmojiColor } from '../utils/colors';

export default function WasteView() {
  const {
    api,
    household,
    isDark,
    showNotification,
    confirmAction,
    user: currentUser,
  } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [collections, setCollections] = useState([]);
  const [editItem, setEditItem] = useState(null);
  const [isNew, setIsNew] = useState(false);

  const isAdmin = currentUser?.role === 'admin';
  const householdId = household?.id;

  const fetchCollections = useCallback(async () => {
    if (!householdId) return;
    setLoading(true);
    try {
      const res = await api.get(`/households/${householdId}/utilities/waste`);
      setCollections(res.data || []);
    } catch (err) {
      console.error('Failed to fetch collections', err);
    } finally {
      setLoading(false);
    }
  }, [api, householdId]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      if (isNew) {
        await api.post(`/households/${householdId}/utilities/waste`, data);
        showNotification('Waste collection added.', 'success');
      } else {
        await api.put(`/households/${householdId}/utilities/waste/${editItem.id}`, data);
        showNotification('Waste collection updated.', 'success');
      }
      fetchCollections();
      setEditItem(null);
      setIsNew(false);
    } catch {
      showNotification('Failed to save collection.', 'danger');
    }
  };

  const handleDelete = async (id) => {
    confirmAction(
      'Delete Collection',
      'Are you sure you want to delete this collection schedule?',
      async () => {
        try {
          await api.delete(`/households/${householdId}/utilities/waste/${id}`);
          showNotification('Collection deleted', 'success');
          fetchCollections();
        } catch {
          showNotification('Failed to delete', 'danger');
        }
      }
    );
  };

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );

  return (
    <Box>
      <Box
        sx={{
          mb: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>
            Waste & Recycling
          </Typography>
          <Typography level="body-md" color="neutral">
            Bin collection schedules and recycling information.
          </Typography>
        </Box>
        <Box>
          {isAdmin && (
            <Button
              variant="solid"
              startDecorator={<Add />}
              onClick={() => {
                setEditItem({});
                setIsNew(true);
              }}
            >
              Add Collection
            </Button>
          )}
        </Box>
      </Box>

      <Grid container spacing={2}>
        {collections.map((c) => (
          <Grid xs={12} sm={6} md={4} key={c.id}>
            <Card
              variant="outlined"
              sx={{ borderRadius: 'md', height: '100%', flexDirection: 'row', p: 2 }}
            >
              <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
                <Avatar
                  size="lg"
                  sx={{
                    bgcolor: getEmojiColor(c.waste_type, isDark),
                  }}
                >
                  <DeleteSweep />
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography level="title-md" sx={{ fontWeight: 'lg' }}>
                    {c.waste_type}
                  </Typography>
                  <Typography level="body-sm" color="neutral">
                    {c.frequency} on {c.collection_day}s
                  </Typography>
                  {c.monthly_amount && (
                    <Typography level="body-xs" fontWeight="bold" color="success">
                      £{c.monthly_amount} / {c.frequency || 'month'} (Day {c.payment_day})
                    </Typography>
                  )}
                  {c.notes && (
                    <Typography level="body-xs" mt={1}>
                      {c.notes}
                    </Typography>
                  )}
                </Box>
                {isAdmin && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <IconButton
                      size="sm"
                      variant="plain"
                      onClick={() => {
                        setEditItem(c);
                        setIsNew(false);
                      }}
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      size="sm"
                      variant="plain"
                      color="danger"
                      onClick={() => handleDelete(c.id)}
                    >
                      <Delete />
                    </IconButton>
                  </Box>
                )}
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Modal open={Boolean(editItem)} onClose={() => setEditItem(null)}>
        <ModalDialog sx={{ maxWidth: 500, width: '100%' }}>
          <DialogTitle>
            {isNew ? 'Add Waste Collection' : `Edit ${editItem?.waste_type}`}
          </DialogTitle>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <Stack spacing={2} mt={1}>
                <FormControl required>
                  <FormLabel>Waste Type (e.g. Recycling, General)</FormLabel>
                  <Input name="waste_type" defaultValue={editItem?.waste_type} />
                </FormControl>

                <FormControl>
                  <FormLabel>Frequency</FormLabel>
                  <Select name="frequency" defaultValue={editItem?.frequency || 'Weekly'}>
                    <Option value="Daily">Daily</Option>
                    <Option value="Weekly">Weekly</Option>
                    <Option value="Biweekly">Biweekly</Option>
                    <Option value="Monthly">Monthly</Option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>Collection Day</FormLabel>
                  <Select name="collection_day" defaultValue={editItem?.collection_day || 'Monday'}>
                    {[
                      'Monday',
                      'Tuesday',
                      'Wednesday',
                      'Thursday',
                      'Friday',
                      'Saturday',
                      'Sunday',
                    ].map((day) => (
                      <Option key={day} value={day}>
                        {day}
                      </Option>
                    ))}
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>Cost Amount (£)</FormLabel>
                  <Input
                    name="monthly_amount"
                    type="number"
                    step="0.01"
                    defaultValue={editItem?.monthly_amount}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Payment Day</FormLabel>
                  <Input
                    name="payment_day"
                    type="number"
                    min="1"
                    max="31"
                    defaultValue={editItem?.payment_day}
                  />
                </FormControl>

                <FormControl orientation="horizontal" sx={{ gap: 1 }}>
                  <Checkbox
                    label="Nearest Working Day (Next)"
                    name="nearest_working_day"
                    defaultChecked={editItem?.nearest_working_day !== 0}
                    value="1"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Notes</FormLabel>
                  <Input name="notes" defaultValue={editItem?.notes} />
                </FormControl>

                <DialogActions>
                  <Button variant="plain" color="neutral" onClick={() => setEditItem(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="solid">
                    Save Collection
                  </Button>
                </DialogActions>
              </Stack>
            </form>
          </DialogContent>
        </ModalDialog>
      </Modal>
    </Box>
  );
}
