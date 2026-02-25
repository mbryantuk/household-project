import React, { useReducer, useEffect, useState } from 'react';
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
import { useHousehold } from '../context/HouseholdContext';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import EmojiPicker from '../components/EmojiPicker';

// --- STATE MACHINE DEFINITION (Item 121) ---
const STEPS = {
  HOUSEHOLD: 0,
  RESIDENTS: 1,
  VEHICLES: 2,
  ASSETS: 3,
  FINISH: 4,
};

const initialState = {
  activeStep: STEPS.HOUSEHOLD,
  loading: true,
  household: null,
  members: [],
  vehicles: [],
  assets: [],
  editItem: null,
};

function onboardingReducer(state, action) {
  switch (action.type) {
    case 'LOAD_SUCCESS':
      return { ...state, ...action.payload, loading: false };
    case 'SET_STEP':
      return { ...state, activeStep: action.step };
    case 'NEXT_STEP':
      return { ...state, activeStep: Math.min(state.activeStep + 1, STEPS.FINISH) };
    case 'PREV_STEP':
      return { ...state, activeStep: Math.max(state.activeStep - 1, STEPS.HOUSEHOLD) };
    case 'SET_EDIT_ITEM':
      return { ...state, editItem: action.item };
    case 'UPDATE_DATA':
      return { ...state, [action.key]: action.data };
    default:
      return state;
  }
}

const stepConfig = [
  { label: 'Household', icon: <Home /> },
  { label: 'Residents', icon: <People /> },
  { label: 'Vehicles', icon: <DirectionsCar /> },
  { label: 'Assets', icon: <Inventory2 /> },
  { label: 'Finish', icon: <DoneAll /> },
];

export default function OnboardingWizard() {
  const { id: householdId } = useParams();
  const navigate = useNavigate();
  const { api } = useAuth();
  const { onSelectHousehold } = useHousehold();
  const { showNotification } = useUI();

  const [state, dispatch] = useReducer(onboardingReducer, initialState);
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
        dispatch({
          type: 'LOAD_SUCCESS',
          payload: {
            household: hRes.data,
            members: mRes.data || [],
            vehicles: vRes.data || [],
            assets: aRes.data || [],
          },
        });
      } catch {
        showNotification('Failed to load household data.', 'danger');
      }
    };
    loadData();
  }, [householdId, api, showNotification]);

  const handleComplete = async () => {
    if (state.household) await onSelectHousehold(state.household);
    navigate(`/household/${householdId}/dashboard`);
  };

  // --- CRUD WRAPPERS ---
  const refreshData = async (key, endpoint) => {
    const res = await api.get(endpoint);
    dispatch({ type: 'UPDATE_DATA', key, data: res.data || [] });
  };

  const saveItem = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const domain =
      state.activeStep === 1 ? 'members' : state.activeStep === 2 ? 'vehicles' : 'assets';

    try {
      if (state.editItem?.id) {
        await api.put(`/households/${householdId}/${domain}/${state.editItem.id}`, data);
      } else {
        await api.post(`/households/${householdId}/${domain}`, data);
      }
      await refreshData(domain, `/households/${householdId}/${domain}`);
      dispatch({ type: 'SET_EDIT_ITEM', item: null });
    } catch {
      showNotification(`Failed to save ${domain}`, 'danger');
    }
  };

  if (state.loading)
    return (
      <Box sx={{ display: 'flex', height: '60vh', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size="lg" />
      </Box>
    );

  return (
    <Box data-testid="onboarding-view" sx={{ maxWidth: 800, mx: 'auto', py: 4, px: 2 }}>
      <Typography level="h1" textAlign="center" mb={1}>
        Welcome to {state.household?.name}
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
                variant={state.activeStep >= index ? 'solid' : 'outlined'}
                color={state.activeStep >= index ? 'primary' : 'neutral'}
              >
                {state.activeStep > index ? <CheckCircle /> : step.icon}
              </StepIndicator>
            }
            active={state.activeStep === index}
            completed={state.activeStep > index}
          >
            <Typography level="title-sm" sx={{ display: { xs: 'none', md: 'block' } }}>
              {step.label}
            </Typography>
          </Step>
        ))}
      </Stepper>

      <Sheet variant="outlined" sx={{ p: { xs: 2, md: 4 }, borderRadius: 'xl', boxShadow: 'sm' }}>
        {state.activeStep === STEPS.HOUSEHOLD && (
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
                  <Input value={state.household?.name} readOnly variant="soft" />
                </FormControl>
              </Grid>
              <Grid xs={12} sm={6}>
                <FormControl>
                  <FormLabel>Currency</FormLabel>
                  <Input value={state.household?.currency} readOnly variant="soft" />
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        )}

        {state.activeStep === STEPS.RESIDENTS && (
          <Box>
            <Stack direction="row" justifyContent="space-between" mb={3}>
              <Typography level="h3">Residents & Family</Typography>
              <Button
                startDecorator={<Add />}
                onClick={() => dispatch({ type: 'SET_EDIT_ITEM', item: { emoji: '👤' } })}
              >
                Add Person
              </Button>
            </Stack>
            <Grid container spacing={2}>
              {state.members.map((m) => (
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
                      onClick={() => dispatch({ type: 'SET_EDIT_ITEM', item: m })}
                    >
                      <Edit />
                    </IconButton>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {state.activeStep === STEPS.VEHICLES && (
          <Box>
            <Stack direction="row" justifyContent="space-between" mb={3}>
              <Typography level="h3">Garage & Fleet</Typography>
              <Button
                startDecorator={<Add />}
                onClick={() => dispatch({ type: 'SET_EDIT_ITEM', item: { emoji: '🚗' } })}
              >
                Add Vehicle
              </Button>
            </Stack>
            <Grid container spacing={2}>
              {state.vehicles.map((v) => (
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
                      onClick={() => dispatch({ type: 'SET_EDIT_ITEM', item: v })}
                    >
                      <Edit />
                    </IconButton>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {state.activeStep === STEPS.FINISH && (
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

        {state.activeStep < STEPS.FINISH && (
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
              onClick={() => dispatch({ type: 'PREV_STEP' })}
              disabled={state.activeStep === 0}
            >
              Back
            </Button>
            <Button
              variant="solid"
              onClick={() => dispatch({ type: 'NEXT_STEP' })}
              endDecorator={<ArrowForward />}
            >
              Next
            </Button>
          </Box>
        )}
      </Sheet>

      <Modal
        open={Boolean(state.editItem)}
        onClose={() => dispatch({ type: 'SET_EDIT_ITEM', item: null })}
      >
        <ModalDialog>
          <DialogTitle>{state.editItem?.id ? 'Edit' : 'Add New'}</DialogTitle>
          <DialogContent>
            <form onSubmit={saveItem}>
              <Stack spacing={2} mt={1}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <IconButton
                    variant="outlined"
                    onClick={() => setEmojiPickerOpen(true)}
                    sx={{ width: 48, height: 48, fontSize: '1.5rem' }}
                  >
                    {state.editItem?.emoji || '🏠'}
                  </IconButton>
                  <Input name="emoji" type="hidden" value={state.editItem?.emoji || ''} />
                  <FormControl required sx={{ flexGrow: 1 }}>
                    <FormLabel>Name / Make</FormLabel>
                    <Input
                      name={state.activeStep === 2 ? 'make' : 'name'}
                      defaultValue={
                        state.activeStep === 2 ? state.editItem?.make : state.editItem?.name
                      }
                      autoFocus
                    />
                  </FormControl>
                </Box>
                {state.activeStep === 1 && (
                  <FormControl required>
                    <FormLabel>Type</FormLabel>
                    <Select name="type" defaultValue={state.editItem?.type || 'adult'}>
                      <Option value="adult">Adult</Option>
                      <Option value="child">Child</Option>
                      <Option value="pet">Pet</Option>
                    </Select>
                  </FormControl>
                )}
                {state.activeStep === 2 && (
                  <FormControl required>
                    <FormLabel>Model</FormLabel>
                    <Input name="model" defaultValue={state.editItem?.model} />
                  </FormControl>
                )}
                <DialogActions>
                  <Button
                    variant="plain"
                    color="neutral"
                    onClick={() => dispatch({ type: 'SET_EDIT_ITEM', item: null })}
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
          dispatch({ type: 'SET_EDIT_ITEM', item: { ...state.editItem, emoji: e } });
          setEmojiPickerOpen(false);
        }}
      />
    </Box>
  );
}
