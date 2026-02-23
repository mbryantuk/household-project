import React, { useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  IconButton,
  Stack,
  Divider,
  Sheet,
  Button,
  LinearProgress,
  Chip,
  CircularProgress,
  Avatar,
  AvatarGroup,
  Table,
  Select,
  Option,
} from '@mui/joy';
import {
  AccountBalance,
  Event,
  RestaurantMenu,
  ShoppingBag,
  Groups,
  DirectionsCar,
  Settings,
  ArrowForward,
  Payments,
  CleaningServices,
  HomeWork,
  Inventory2,
  WbSunny,
  Cloud,
  AcUnit,
  Thunderstorm,
  Add,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  MoreHoriz,
  PlayArrow,
} from '@mui/icons-material';

import DashboardWidget from '../components/DashboardWidget';
import { APP_NAME } from '../constants';
import { useFinanceSummary } from '../hooks/useFinanceData';

// Simple Sparkline Component (SVG)
const Sparkline = ({ data = [10, 15, 12, 20, 25, 22, 30], color = '#22c55e', height = 40 }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - ((d - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ width: '100%', height, overflow: 'visible' }}
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="3"
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/**
 * Modern "Lifted" Dashboard
 */
export default function HomeView() {
  const navigate = useNavigate();
  const { household, user, members = [], vehicles = [], api } = useOutletContext();

  const { data: financeSummary } = useFinanceSummary(api, household?.id);

  // Time-based Greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  // Today's Outlook Icon
  const weatherIcon = useMemo(() => {
    return <WbSunny sx={{ fontSize: '3rem', color: 'warning.main', opacity: 0.8 }} />;
  }, []);

  const MODULES = useMemo(
    () => [
      {
        id: 'finance',
        label: 'Finance',
        icon: AccountBalance,
        color: 'success',
        path: 'finance',
        desc: 'Budget & Assets',
      },
      {
        id: 'meals',
        label: 'Meals',
        icon: RestaurantMenu,
        color: 'warning',
        path: 'meals',
        desc: 'Weekly Planner',
      },
      {
        id: 'shopping',
        label: 'Groceries',
        icon: ShoppingBag,
        color: 'primary',
        path: 'shopping',
        desc: 'Grocery List',
      },
      {
        id: 'chores',
        label: 'Chores',
        icon: CleaningServices,
        color: 'info',
        path: 'chores',
        desc: 'Task Management',
      },
      {
        id: 'vehicles',
        label: 'Vehicles',
        icon: DirectionsCar,
        color: 'danger',
        path: 'vehicles',
        desc: 'Fleet Status',
      },
      {
        id: 'house',
        label: 'Property',
        icon: HomeWork,
        color: 'neutral',
        path: 'house',
        desc: 'House Hub',
      },
    ],
    []
  );

  return (
    <Box sx={{ width: '100%', maxWidth: 1600, mx: 'auto', pb: 10 }}>
      {/* 1. HERO SECTION: Morning Briefing */}
      <Box
        sx={{
          mb: 4,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box>
          <Typography
            level="h1"
            sx={{
              fontSize: { xs: '2rem', md: '3rem' },
              mb: 0.5,
              background:
                'linear-gradient(45deg, var(--joy-palette-primary-main), var(--joy-palette-primary-400))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {greeting}, {user?.first_name || 'Friend'}
          </Typography>
          <Typography level="body-md" color="neutral">
            {dateStr} • {household?.name}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="soft"
            color="primary"
            startDecorator={<Add />}
            onClick={() => navigate('../shopping')}
          >
            Add Item
          </Button>
          <Button
            variant="solid"
            color="primary"
            startDecorator={<Payments />}
            onClick={() => navigate('../finance')}
          >
            Log Expense
          </Button>
        </Stack>
      </Box>

      {/* 2. MASONRY GRID LAYOUT */}
      <Grid container spacing={2}>
        {/* ROW 1: Key Metrics */}
        <Grid xs={12} md={8}>
          <Grid container spacing={2}>
            {/* A. Wealth Tracking Widget */}
            <Grid xs={12} sm={6}>
              <DashboardWidget title="Wealth Tracking" icon={TrendingUp} color="success">
                <Stack spacing={2} sx={{ mt: 1 }}>
                  <Box>
                    <Typography level="h2">
                      {household?.currency}
                      {financeSummary?.netWorth?.toLocaleString() || '0.00'}
                    </Typography>
                    <Typography
                      level="body-xs"
                      color="success"
                      sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                    >
                      <TrendingUp fontSize="inherit" /> +2.4% this month
                    </Typography>
                  </Box>
                  <Box sx={{ height: 60, width: '100%', opacity: 0.8 }}>
                    <Sparkline color="var(--joy-palette-success-main)" />
                  </Box>
                </Stack>
              </DashboardWidget>
            </Grid>

            {/* B. Budget Health Widget */}
            <Grid xs={12} sm={6}>
              <DashboardWidget title="Budget Health" icon={AccountBalance} color="warning">
                <Stack spacing={2} sx={{ mt: 1 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-end',
                    }}
                  >
                    <Box>
                      <Typography level="body-sm" color="neutral">
                        Monthly Spend
                      </Typography>
                      <Typography level="h3">
                        {household?.currency}
                        {Math.abs(financeSummary?.spending || 0).toLocaleString()}
                      </Typography>
                    </Box>
                    <Typography level="body-sm" color="neutral">
                      of {household?.currency}
                      {(financeSummary?.monthlyIncome || 2000).toLocaleString()}
                    </Typography>
                  </Box>
                  <Box>
                    <LinearProgress
                      determinate
                      value={Math.min(
                        (Math.abs(financeSummary?.spending || 0) /
                          (financeSummary?.monthlyIncome || 1)) *
                          100,
                        100
                      )}
                      color="warning"
                      thickness={8}
                      sx={{ borderRadius: 'xl', bgcolor: 'background.level2' }}
                    />
                    <Typography level="body-xs" sx={{ mt: 1, textAlign: 'right' }}>
                      {100 -
                        Math.min(
                          Math.round(
                            (Math.abs(financeSummary?.spending || 0) /
                              (financeSummary?.monthlyIncome || 1)) *
                              100
                          ),
                          100
                        )}
                      % remaining
                    </Typography>
                  </Box>
                </Stack>
              </DashboardWidget>
            </Grid>
          </Grid>
        </Grid>

        {/* ROW 1: Side Panel (Weather/Status) */}
        <Grid xs={12} md={4}>
          <DashboardWidget
            title="Today's Outlook"
            icon={WbSunny}
            color="warning"
            sx={{ height: '100%' }}
          >
            <Stack
              spacing={2}
              alignItems="center"
              justifyContent="center"
              sx={{ height: '100%', py: 2 }}
            >
              {weatherIcon}
              <Box sx={{ textAlign: 'center' }}>
                <Typography level="h3">14°C</Typography>
                <Typography level="body-sm">Partly Cloudy</Typography>
              </Box>
              <Divider sx={{ width: '80%' }} />
              <Stack direction="row" spacing={2} justifyContent="center" sx={{ width: '100%' }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography level="title-sm">{members.length}</Typography>
                  <Typography level="body-xs">People</Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography level="title-sm">{vehicles.length}</Typography>
                  <Typography level="body-xs">Vehicles</Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography level="title-sm">Active</Typography>
                  <Typography level="body-xs">Status</Typography>
                </Box>
              </Stack>
            </Stack>
          </DashboardWidget>
        </Grid>

        {/* ROW 2: Quick Navigation */}
        <Grid xs={12}>
          <Typography
            level="title-sm"
            sx={{ mb: 2, mt: 2, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.7 }}
          >
            Modules
          </Typography>
          <Grid container spacing={2}>
            {MODULES.map((mod) => (
              <Grid xs={6} sm={4} md={2} key={mod.id}>
                <Sheet
                  variant="outlined"
                  onClick={() => navigate(`../${mod.path}`)}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 2,
                    gap: 1.5,
                    borderRadius: 'lg',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative',
                    overflow: 'hidden',
                    '&:hover': {
                      bgcolor: 'background.surface',
                      borderColor: `var(--joy-palette-${mod.color}-outlinedBorder)`,
                      transform: 'translateY(-4px)',
                      boxShadow: `0 4px 20px var(--joy-palette-${mod.color}-softBg)`,
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 48,
                      height: 48,
                      borderRadius: '12px',
                      background: `linear-gradient(135deg, var(--joy-palette-${mod.color}-400) 0%, var(--joy-palette-${mod.color}-600) 100%)`,
                      color: '#fff',
                      boxShadow: 'sm',
                    }}
                  >
                    <mod.icon />
                  </Box>
                  <Typography level="title-sm">{mod.label}</Typography>
                </Sheet>
              </Grid>
            ))}
          </Grid>
        </Grid>

        {/* ROW 3: Recent Activity / Feed */}
        <Grid xs={12} md={6}>
          <DashboardWidget title="Recent Activity" icon={Event} color="info">
            <Stack spacing={0} divider={<Divider />}>
              <Box sx={{ display: 'flex', gap: 2, py: 2, alignItems: 'center' }}>
                <Avatar size="sm" color="success">
                  <CheckCircle fontSize="small" />
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography level="title-sm">Rent Paid</Typography>
                  <Typography level="body-xs">Finance • Yesterday</Typography>
                </Box>
                <Typography level="body-sm" fontWeight="bold">
                  -{household?.currency}1,200
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 2, py: 2, alignItems: 'center' }}>
                <Avatar size="sm" color="primary">
                  <ShoppingBag fontSize="small" />
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography level="title-sm">Weekly Shop</Typography>
                  <Typography level="body-xs">Groceries • 2 days ago</Typography>
                </Box>
                <Typography level="body-sm" fontWeight="bold">
                  12 items
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 2, py: 2, alignItems: 'center' }}>
                <Avatar size="sm" color="warning">
                  <DirectionsCar fontSize="small" />
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography level="title-sm">MOT Due</Typography>
                  <Typography level="body-xs">Vehicles • In 4 days</Typography>
                </Box>
                <Chip size="sm" color="warning">
                  Upcoming
                </Chip>
              </Box>
            </Stack>
            <Button
              variant="plain"
              size="sm"
              endDecorator={<ArrowForward />}
              sx={{ mt: 1, width: '100%' }}
            >
              View All Activity
            </Button>
          </DashboardWidget>
        </Grid>

        {/* ROW 3: Chores / Tasks */}
        <Grid xs={12} md={6}>
          <DashboardWidget title="Urgent Tasks" icon={CleaningServices} color="danger">
            <Sheet
              variant="soft"
              color="neutral"
              sx={{
                borderRadius: 'md',
                p: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                mb: 2,
              }}
            >
              <CircularProgress determinate value={75} size="lg" color="success">
                75%
              </CircularProgress>
              <Box>
                <Typography level="title-md">You're doing great!</Typography>
                <Typography level="body-sm">3 of 4 daily tasks completed.</Typography>
              </Box>
            </Sheet>
            <Stack spacing={1}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1 }}>
                <Avatar size="sm">🗑️</Avatar>
                <Typography
                  level="body-sm"
                  sx={{ flexGrow: 1, textDecoration: 'line-through', opacity: 0.6 }}
                >
                  Take out bins
                </Typography>
                <CheckCircle color="success" fontSize="small" />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1 }}>
                <Avatar size="sm">🪴</Avatar>
                <Typography level="body-sm" sx={{ flexGrow: 1 }}>
                  Water plants
                </Typography>
                <Button size="sm" variant="outlined" color="neutral">
                  Done
                </Button>
              </Box>
            </Stack>
          </DashboardWidget>
        </Grid>
      </Grid>
    </Box>
  );
}
