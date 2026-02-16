import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Stepper, Step, StepIndicator, 
  Sheet, Button, Stack, FormControl, FormLabel, Input, 
  Avatar, IconButton, Grid, Divider, CircularProgress,
  List, ListItem, ListItemButton, ListItemContent, ListItemDecorator,
  Checkbox
} from '@mui/joy';
import { 
  Home, People, DirectionsCar, Inventory2, 
  CheckCircle, ArrowForward, ArrowBack, Add, Edit, Delete,
  AccountBalance, DoneAll
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useHousehold } from '../contexts/HouseholdContext';
import EmojiPicker from '../components/EmojiPicker';
import { getEmojiColor } from '../theme';

const steps = [
  { label: 'Household', icon: <Home /> },
  { label: 'Residents', icon: <People /> },
  { label: 'Vehicles', icon: <DirectionsCar /> },
  { label: 'Assets', icon: <Inventory2 /> },
  { label: 'Finish', icon: <DoneAll /> }
];

export default function OnboardingWizard() {
  const { id: householdId } = useParams();
  const navigate = useNavigate();
  const { api, showNotification, isDark, onSelectHousehold } = useHousehold();
  
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [household, setHousehold] = useState(null);
  const [members, setMembers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [assets, setAssets] = useState([]);

  // Form States
  const [editItem, setEditItem] = useState(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  useEffect(() => {
    if (!householdId || !api) return;
    
    const loadData = async () => {
        setLoading(true);
        try {
            const [hRes, mRes, vRes, aRes] = await Promise.all([
                api.get(`/households/${householdId}`),
                api.get(`/households/${householdId}/members`),
                api.get(`/households/${householdId}/vehicles`),
                api.get(`/households/${householdId}/assets`)
            ]);
            setHousehold(hRes.data);
            setMembers(mRes.data || []);
            setVehicles(vRes.data || []);
            setAssets(aRes.data || []);
        } catch (err) {
            console.error("Onboarding data load failed", err);
            showNotification("Failed to load household data.", "danger");
        } finally {
            setLoading(false);
        }
    };
    loadData();
  }, [householdId, api, showNotification]);

  const handleNext = () => setActiveStep((prev) => prev + 1);
  const handleBack = () => setActiveStep((prev) => prev - 1);

  const handleComplete = async () => {
      // Mark as onboarding complete if we have a flag, for now just redirect
      if (household) await onSelectHousehold(household);
      navigate(`/household/${householdId}/dashboard`);
  };

  // --- CRUD HELPERS ---
  const saveMember = async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.currentTarget));
      try {
          if (editItem?.id) {
              await api.put(`/households/${householdId}/members/${editItem.id}`, data);
          } else {
              await api.post(`/households/${householdId}/members`, data);
          }
          const res = await api.get(`/households/${householdId}/members`);
          setMembers(res.data || []);
          setEditItem(null);
      } catch { showNotification("Failed to save member", "danger"); }
  };

  const deleteMember = async (id) => {
      try {
          await api.delete(`/households/${householdId}/members/${id}`);
          setMembers(prev => prev.filter(m => m.id !== id));
      } catch { showNotification("Failed to delete", "danger"); }
  };

  const saveVehicle = async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.currentTarget));
      try {
          if (editItem?.id) {
              await api.put(`/households/${householdId}/vehicles/${editItem.id}`, data);
          } else {
              await api.post(`/households/${householdId}/vehicles`, data);
          }
          const res = await api.get(`/households/${householdId}/vehicles`);
          setVehicles(res.data || []);
          setEditItem(null);
      } catch { showNotification("Failed to save vehicle", "danger"); }
  };

  const deleteVehicle = async (id) => {
      try {
          await api.delete(`/households/${householdId}/vehicles/${id}`);
          setVehicles(prev => prev.filter(v => v.id !== id));
      } catch { showNotification("Failed to delete", "danger"); }
  };

  const saveAsset = async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.currentTarget));
      try {
          if (editItem?.id) {
              await api.put(`/households/${householdId}/assets/${editItem.id}`, data);
          } else {
              await api.post(`/households/${householdId}/assets`, data);
          }
          const res = await api.get(`/households/${householdId}/assets`);
          setAssets(res.data || []);
          setEditItem(null);
      } catch { showNotification("Failed to save asset", "danger"); }
  };

  const deleteAsset = async (id) => {
      try {
          await api.delete(`/households/${householdId}/assets/${id}`);
          setAssets(prev => prev.filter(a => a.id !== id));
      } catch { showNotification("Failed to delete", "danger"); }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 20 }}><CircularProgress size="lg" /></Box>;

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', py: 4, px: 2 }}>
      <Typography level="h1" textAlign="center" mb={1}>Welcome to {household?.name}</Typography>
      <Typography level="body-md" textAlign="center" color="neutral" mb={4}>Let's get your household set up in a few simple steps.</Typography>

      <Stepper sx={{ mb: 6 }}>
        {steps.map((step, index) => (
          <Step 
            key={step.label}
            indicator={
              <StepIndicator variant={activeStep >= index ? 'solid' : 'outlined'} color={activeStep >= index ? 'primary' : 'neutral'}>
                {activeStep > index ? <CheckCircle /> : step.icon}
              </StepIndicator>
            }
            active={activeStep === index}
            completed={activeStep > index}
          >
            <Typography level="title-sm" sx={{ display: { xs: 'none', md: 'block' } }}>{step.label}</Typography>
          </Step>
        ))}
      </Stepper>

      <Sheet variant="outlined" sx={{ p: { xs: 2, md: 4 }, borderRadius: 'xl', boxShadow: 'sm', bgcolor: 'background.surface' }}>
        
        {/* STEP 0: HOUSEHOLD DETAILS */}
        {activeStep === 0 && (
            <Box>
                <Typography level="h3" mb={1}>Household Overview</Typography>
                <Typography level="body-sm" color="neutral" mb={3}>Confirm your primary household details.</Typography>
                <Grid container spacing={2}>
                    <Grid xs={12} sm={6}>
                        <FormControl><FormLabel>Household Name</FormLabel><Input value={household?.name} readOnly variant="soft" /></FormControl>
                    </Grid>
                    <Grid xs={12} sm={6}>
                        <FormControl><FormLabel>Currency</FormLabel><Input value={household?.currency} readOnly variant="soft" /></FormControl>
                    </Grid>
                    <Grid xs={12}>
                        <Typography level="title-sm" mt={2} mb={1}>Enabled Modules</Typography>
                        <Stack direction="row" spacing={1}>
                            {['pets', 'vehicles', 'meals'].map(m => (
                                <Chip key={m} variant="soft" color="primary" sx={{ textTransform: 'capitalize' }}>{m}</Chip>
                            ))}
                        </Stack>
                    </Grid>
                </Grid>
            </Box>
        )}

        {/* STEP 1: RESIDENTS */}
        {activeStep === 1 && (
            <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Box>
                        <Typography level="h3">Residents & Family</Typography>
                        <Typography level="body-sm" color="neutral">Add the people who live in your home.</Typography>
                    </Box>
                    <Button startDecorator={<Add />} onClick={() => setEditItem({ emoji: '👤' })}>Add Person</Button>
                </Box>

                <Grid container spacing={2}>
                    {members.map(m => (
                        <Grid key={m.id} xs={12} sm={6}>
                            <Card variant="soft" sx={{ flexDirection: 'row', alignItems: 'center', gap: 2, p: 1.5 }}>
                                <Avatar size="lg" sx={{ bgcolor: getEmojiColor(m.emoji, isDark) }}>{m.emoji}</Avatar>
                                <Box sx={{ flexGrow: 1 }}>
                                    <Typography level="title-md">{m.name}</Typography>
                                    <Typography level="body-xs" sx={{ textTransform: 'capitalize' }}>{m.type}</Typography>
                                </Box>
                                <IconButton size="sm" variant="plain" onClick={() => setEditItem(m)}><Edit /></IconButton>
                                <IconButton size="sm" variant="plain" color="danger" onClick={() => deleteMember(m.id)}><Delete /></IconButton>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </Box>
        )}

        {/* STEP 2: VEHICLES */}
        {activeStep === 2 && (
            <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Box>
                        <Typography level="h3">Garage & Fleet</Typography>
                        <Typography level="body-sm" color="neutral">Track cars, bikes, and other vehicles.</Typography>
                    </Box>
                    <Button startDecorator={<Add />} onClick={() => setEditItem({ emoji: '🚗' })}>Add Vehicle</Button>
                </Box>

                <Grid container spacing={2}>
                    {vehicles.map(v => (
                        <Grid key={v.id} xs={12} sm={6}>
                            <Card variant="soft" sx={{ flexDirection: 'row', alignItems: 'center', gap: 2, p: 1.5 }}>
                                <Avatar size="lg" sx={{ bgcolor: getEmojiColor(v.emoji, isDark) }}>{v.emoji}</Avatar>
                                <Box sx={{ flexGrow: 1 }}>
                                    <Typography level="title-md">{v.make} {v.model}</Typography>
                                    <Typography level="body-xs">{v.registration}</Typography>
                                </Box>
                                <IconButton size="sm" variant="plain" onClick={() => setEditItem(v)}><Edit /></IconButton>
                                <IconButton size="sm" variant="plain" color="danger" onClick={() => deleteVehicle(v.id)}><Delete /></IconButton>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </Box>
        )}

        {/* STEP 3: ASSETS */}
        {activeStep === 3 && (
            <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Box>
                        <Typography level="h3">High-Value Assets</Typography>
                        <Typography level="body-sm" color="neutral">Track insurance and warranties for big items.</Typography>
                    </Box>
                    <Button startDecorator={<Add />} onClick={() => setEditItem({ emoji: '📦' })}>Add Asset</Button>
                </Box>

                <Grid container spacing={2}>
                    {assets.map(a => (
                        <Grid key={a.id} xs={12} sm={6}>
                            <Card variant="soft" sx={{ flexDirection: 'row', alignItems: 'center', gap: 2, p: 1.5 }}>
                                <Avatar size="lg" sx={{ bgcolor: getEmojiColor(a.emoji, isDark) }}>{a.emoji}</Avatar>
                                <Box sx={{ flexGrow: 1 }}>
                                    <Typography level="title-md">{a.name}</Typography>
                                    <Typography level="body-xs">{a.category}</Typography>
                                </Box>
                                <IconButton size="sm" variant="plain" onClick={() => setEditItem(a)}><Edit /></IconButton>
                                <IconButton size="sm" variant="plain" color="danger" onClick={() => deleteAsset(a.id)}><Delete /></IconButton>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </Box>
        )}

        {/* STEP 4: FINISH */}
        {activeStep === 4 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
                <Avatar size="lg" color="success" variant="soft" sx={{ width: 100, height: 100, mx: 'auto', mb: 3, fontSize: '4rem' }}>✨</Avatar>
                <Typography level="h2" mb={1}>You're all set!</Typography>
                <Typography level="body-md" color="neutral" mb={4}>Your household setup is complete. You can add more details like finances and meal plans from the dashboard.</Typography>
                <Button size="lg" variant="solid" color="primary" onClick={handleComplete} endDecorator={<ArrowForward />}>Go to Dashboard</Button>
            </Box>
        )}

        {activeStep < 4 && (
            <Box sx={{ mt: 6, pt: 3, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
                <Button variant="plain" color="neutral" startDecorator={<ArrowBack />} onClick={handleBack} disabled={activeStep === 0}>Back</Button>
                <Button variant="solid" color="primary" endDecorator={<ArrowForward />} onClick={handleNext}>Next</Button>
            </Box>
        )}
      </Sheet>

      {/* ITEM MODALS */}
      <Modal open={Boolean(editItem)} onClose={() => setEditItem(null)}>
          <ModalDialog>
              <DialogTitle>{editItem?.id ? 'Edit' : 'Add New'}</DialogTitle>
              <DialogContent>
                  <form onSubmit={activeStep === 1 ? saveMember : (activeStep === 2 ? saveVehicle : saveAsset)}>
                      <Stack spacing={2} mt={1}>
                          <Box sx={{ display: 'flex', gap: 2 }}>
                              <IconButton variant="outlined" onClick={() => setEmojiPickerOpen(true)} sx={{ width: 48, height: 48, fontSize: '1.5rem' }}>{editItem?.emoji || '🏠'}</IconButton>
                              <Input name="emoji" type="hidden" value={editItem?.emoji || ''} />
                              <FormControl required sx={{ flexGrow: 1 }}>
                                  <FormLabel>Name / Make</FormLabel>
                                  <Input name={activeStep === 2 ? 'make' : 'name'} defaultValue={activeStep === 2 ? editItem?.make : editItem?.name} autoFocus />
                              </FormControl>
                          </Box>
                          {activeStep === 1 && (
                              <FormControl required>
                                  <FormLabel>Type</FormLabel>
                                  <Select name="type" defaultValue={editItem?.type || 'adult'}>
                                      <Option value="adult">Adult</Option>
                                      <Option value="child">Child</Option>
                                      <Option value="pet">Pet</Option>
                                  </Select>
                              </FormControl>
                          )}
                          {activeStep === 2 && (
                              <FormControl required><FormLabel>Model</FormLabel><Input name="model" defaultValue={editItem?.model} /></FormControl>
                          )}
                          {activeStep === 3 && (
                              <FormControl required><FormLabel>Category</FormLabel><Input name="category" defaultValue={editItem?.category} /></FormControl>
                          )}
                          <DialogActions>
                              <Button variant="plain" color="neutral" onClick={() => setEditItem(null)}>Cancel</Button>
                              <Button type="submit">Save</Button>
                          </DialogActions>
                      </Stack>
                  </form>
              </DialogContent>
          </ModalDialog>
      </Modal>

      <EmojiPicker 
        open={emojiPickerOpen} 
        onClose={() => setEmojiPickerOpen(false)} 
        onEmojiSelect={(e) => { setEditItem({ ...editItem, emoji: e }); setEmojiPickerOpen(false); }} 
        isDark={isDark} 
      />
    </Box>
  );
}