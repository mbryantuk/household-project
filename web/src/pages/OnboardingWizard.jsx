import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Stepper,
  Step,
  StepIndicator,
  Sheet,
  Button,
  Stack,
  FormControl,
  FormLabel,
  Input,
  Avatar,
  IconButton,
  Grid,
  CircularProgress,
  Select,
  Option,
  Modal,
  ModalDialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
} from '@mui/joy';
import {
  Home,
  People,
  DirectionsCar,
  Inventory2,
  CheckCircle,
  ArrowForward,
  ArrowBack,
  Add,
  Edit,
  DoneAll,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useMachine } from '@xstate/react';
import { onboardingMachine } from './onboarding/onboardingMachine';
import { useHousehold } from '../context/HouseholdContext';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import EmojiPicker from '../components/EmojiPicker';

const stepConfig = [
  { label: 'Household', icon: <Home />, state: 'welcome' },
  { label: 'Residents', icon: <People />, state: 'householdSetup' },
  { label: 'Vehicles', icon: <DirectionsCar />, state: 'memberSync' },
  { label: 'Assets', icon: <Inventory2 />, state: 'financeImport' },
  { label: 'Finish', icon: <DoneAll />, state: 'complete' },
];

export default function OnboardingWizard() {
  const { id: householdId } = useParams();
  const navigate = useNavigate();
  const { api } = useAuth();
  const { onSelectHousehold } = useHousehold();
  const { showNotification } = useUI();

  const [state, send] = useMachine(onboardingMachine);
  const [data, setData] = useState({
    loading: true,
    household: null,
    members: [],
    vehicles: [],
    assets: [],
    editItem: null,
  });
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  useEffect(() => {
    if (!householdId || !api) return;

    const loadData = async () => {
      try {
        const [hRes, mRes, vRes, aRes] = await Promise.all([
          api.get(`/households/${householdId}`),
          api.get(`/households/${householdId}/members`),
          api.get(`/households/${householdId}/vehicles`),
          api.get(`/households/${householdId}/assets`),
        ]);
        setData((prev) => ({
          ...prev,
          household: hRes.data,
          members: mRes.data || [],
          vehicles: vRes.data || [],
          assets: aRes.data || [],
          loading: false,
        }));
      } catch {
        showNotification('Failed to load household data.', 'danger');
      }
    };
    loadData();
  }, [householdId, api, showNotification]);

  const activeStep = stepConfig.findIndex((s) => state.matches(s.state));

  const handleComplete = async () => {
    if (data.household) await onSelectHousehold(data.household);
    navigate(`/household/${householdId}/dashboard`);
  };

  const refreshData = async (key, endpoint) => {
    const res = await api.get(endpoint);
    setData((prev) => ({ ...prev, [key]: res.data || [] }));
  };

  const saveItem = async (e) => {
    e.preventDefault();
    const formData = Object.fromEntries(new FormData(e.currentTarget));
    const domain =
      activeStep === 1 ? 'members' : activeStep === 2 ? 'vehicles' : 'assets';

    try {
      if (data.editItem?.id) {
        await api.put(`/households/${householdId}/${domain}/${data.editItem.id}`, formData);
      } else {
        await api.post(`/households/${householdId}/${domain}`, formData);
      }
      await refreshData(domain, `/households/${householdId}/${domain}`);
      setData((prev) => ({ ...prev, editItem: null }));
    } catch {
      showNotification(`Failed to save ${domain}`, 'danger');
    }
  };

  if (data.loading)
    return (
      <Box sx={{ display: 'flex', height: '60vh', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size="lg" />
      </Box>
    );

  return (
    <Box data-testid="onboarding-view" sx={{ maxWidth: 800, mx: 'auto', py: 4, px: 2 }}>
      <Typography level="h1" textAlign="center" mb={1}>
        Welcome to {data.household?.name}
      </Typography>
      <Typography level="body-md" textAlign="center" color="neutral" mb={4}>
        Let's get your household set up in a few simple steps.
      </Typography>

      <Stepper sx={{ mb: 6 }}>
        {stepConfig.map((step, index) => (
          <Step
            key={step.label}
            indicator={
              <StepIndicator
                variant={activeStep >= index ? 'solid' : 'outlined'}
                color={activeStep >= index ? 'primary' : 'neutral'}
              >
                {activeStep > index ? <CheckCircle /> : step.icon}
              </StepIndicator>
            }
            active={activeStep === index}
            completed={activeStep > index}
          >
            <Typography level="title-sm" sx={{ display: { xs: 'none', md: 'block' } }}>
              {step.label}
            </Typography>
          </Step>
        ))}
      </Stepper>

      <Sheet variant="outlined" sx={{ p: { xs: 2, md: 4 }, borderRadius: 'xl', boxShadow: 'sm' }}>
        {state.matches('welcome') && (
          <Box>
            <Typography level="h3" mb={1}>
              Household Overview
            </Typography>
            <Typography level="body-sm" color="neutral" mb={3}>
              Confirm your primary household details.
            </Typography>
            <Grid container spacing={2}>
              <Grid xs={12} sm={6}>
                <FormControl>
                  <FormLabel>Name</FormLabel>
                  <Input value={data.household?.name} readOnly variant="soft" />
                </FormControl>
              </Grid>
              <Grid xs={12} sm={6}>
                <FormControl>
                  <FormLabel>Currency</FormLabel>
                  <Input value={data.household?.currency} readOnly variant="soft" />
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        )}

        {state.matches('householdSetup') && (
          <Box>
            <Stack direction="row" justifyContent="space-between" mb={3}>
              <Typography level="h3">Residents & Family</Typography>
              <Button
                startDecorator={<Add />}
                onClick={() => setData((prev) => ({ ...prev, editItem: { emoji: '👤' } }))}
              >
                Add Person
              </Button>
            </Stack>
            <Grid container spacing={2}>
              {data.members.map((m) => (
                <Grid key={m.id} xs={12} sm={6}>
                  <Card
                    variant="soft"
                    sx={{ flexDirection: 'row', alignItems: 'center', gap: 2, p: 1.5 }}
                  >
                    <Avatar size="lg">{m.emoji}</Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography level="title-md">{m.name}</Typography>
                      <Typography level="body-xs">{m.type}</Typography>
                    </Box>
                    <IconButton
                      size="sm"
                      onClick={() => setData((prev) => ({ ...prev, editItem: m }))}
                    >
                      <Edit />
                    </IconButton>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {state.matches('memberSync') && (
          <Box>
            <Stack direction="row" justifyContent="space-between" mb={3}>
              <Typography level="h3">Garage & Fleet</Typography>
              <Button
                startDecorator={<Add />}
                onClick={() => setData((prev) => ({ ...prev, editItem: { emoji: '🚗' } }))}
              >
                Add Vehicle
              </Button>
            </Stack>
            <Grid container spacing={2}>
              {data.vehicles.map((v) => (
                <Grid key={v.id} xs={12} sm={6}>
                  <Card
                    variant="soft"
                    sx={{ flexDirection: 'row', alignItems: 'center', gap: 2, p: 1.5 }}
                  >
                    <Avatar size="lg">{v.emoji}</Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography level="title-md">
                        {v.make} {v.model}
                      </Typography>
                    </Box>
                    <IconButton
                      size="sm"
                      onClick={() => setData((prev) => ({ ...prev, editItem: v }))}
                    >
                      <Edit />
                    </IconButton>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {state.matches('complete') && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Avatar
              color="success"
              variant="soft"
              sx={{ width: 100, height: 100, mx: 'auto', mb: 3, fontSize: '4rem' }}
            >
              ✨
            </Avatar>
            <Typography level="h2" mb={1}>
              You're all set!
            </Typography>
            <Button size="lg" onClick={handleComplete} endDecorator={<ArrowForward />}>
              Go to Dashboard
            </Button>
          </Box>
        )}

        {!state.matches('complete') && (
          <Box
            sx={{
              mt: 6,
              pt: 3,
              borderTop: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <Button
              variant="plain"
              color="neutral"
              startDecorator={<ArrowBack />}
              onClick={() => send({ type: 'BACK' })}
              disabled={state.matches('welcome')}
            >
              Back
            </Button>
            <Button
              variant="solid"
              onClick={() => send({ type: 'NEXT' })}
              endDecorator={<ArrowForward />}
            >
              Next
            </Button>
          </Box>
        )}
      </Sheet>

      <Modal
        open={Boolean(data.editItem)}
        onClose={() => setData((prev) => ({ ...prev, editItem: null }))}
      >
        <ModalDialog>
          <DialogTitle>{data.editItem?.id ? 'Edit' : 'Add New'}</DialogTitle>
          <DialogContent>
            <form onSubmit={saveItem}>
              <Stack spacing={2} mt={1}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <IconButton
                    variant="outlined"
                    onClick={() => setEmojiPickerOpen(true)}
                    sx={{ width: 48, height: 48, fontSize: '1.5rem' }}
                  >
                    {data.editItem?.emoji || '🏠'}
                  </IconButton>
                  <Input name="emoji" type="hidden" value={data.editItem?.emoji || ''} />
                  <FormControl required sx={{ flexGrow: 1 }}>
                    <FormLabel>Name / Make</FormLabel>
                    <Input
                      name={activeStep === 2 ? 'make' : 'name'}
                      defaultValue={
                        activeStep === 2 ? data.editItem?.make : data.editItem?.name
                      }
                      autoFocus
                    />
                  </FormControl>
                </Box>
                {activeStep === 1 && (
                  <FormControl required>
                    <FormLabel>Type</FormLabel>
                    <Select name="type" defaultValue={data.editItem?.type || 'adult'}>
                      <Option value="adult">Adult</Option>
                      <Option value="child">Child</Option>
                      <Option value="pet">Pet</Option>
                    </Select>
                  </FormControl>
                )}
                {activeStep === 2 && (
                  <FormControl required>
                    <FormLabel>Model</FormLabel>
                    <Input name="model" defaultValue={data.editItem?.model} />
                  </FormControl>
                )}
                <DialogActions>
                  <Button
                    variant="plain"
                    color="neutral"
                    onClick={() => setData((prev) => ({ ...prev, editItem: null }))}
                  >
                    Cancel
                  </Button>
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
        onEmojiSelect={(e) => {
          setData((prev) => ({ ...prev, editItem: { ...data.editItem, emoji: e } }));
          setEmojiPickerOpen(false);
        }}
      />
    </Box>
  );
}
