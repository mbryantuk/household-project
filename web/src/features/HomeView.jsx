import React, { useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  Box,
  Typography,
  Stack,
  Button,
  LinearProgress,
  CircularProgress,
  Avatar,
  Divider,
  Sheet,
} from '@mui/joy';
import {
  AccountBalance,
  Event,
  ShoppingBag,
  Add,
  Payments,
  TrendingUp,
  CheckCircle,
  ArrowForward,
  CleaningServices,
  WbSunny,
} from '@mui/icons-material';
import { Responsive, WidthProvider } from 'react-grid-layout/legacy';
import DashboardWidget from '../components/DashboardWidget';
import AnalyticsWidget from '../components/widgets/AnalyticsWidget';
import { useFinanceSummary } from '../hooks/useFinanceData';
import { getRelativeTime } from '../utils/date';
import { prefetchComponent } from '../utils/prefetch';

const ResponsiveGridLayout = WidthProvider(Responsive);

const yesterday = new Date(Date.now() - 86400000);

const Sparkline = ({ color = '#22c55e', height = 40 }) => (
  <svg
    viewBox="0 0 100 100"
    preserveAspectRatio="none"
    style={{ width: '100%', height, overflow: 'visible' }}
  >
    <polyline
      points="0,80 20,60 40,70 60,30 80,40 100,10"
      fill="none"
      stroke={color}
      strokeWidth="3"
      vectorEffect="non-scaling-stroke"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function HomeView() {
  const navigate = useNavigate();
  const { household, user, members = [], vehicles = [], api, onUpdateProfile } = useOutletContext();
  const { data: financeSummary, isLoading: financeLoading } = useFinanceSummary(api, household?.id);

  const initialLayouts = useMemo(() => {
    try {
      return user?.dashboardLayout
        ? JSON.parse(user.dashboardLayout)
        : {
            lg: [
              { i: 'wealth', x: 0, y: 0, w: 4, h: 2 },
              { i: 'budget', x: 4, y: 0, w: 4, h: 2 },
              { i: 'outlook', x: 8, y: 0, w: 4, h: 2 },
              { i: 'analytics', x: 0, y: 2, w: 12, h: 3 },
              { i: 'activity', x: 0, y: 5, w: 6, h: 4 },
              { i: 'tasks', x: 6, y: 5, w: 6, h: 4 },
            ],
          };
    } catch {
      return { lg: [] };
    }
  }, [user?.dashboardLayout]);

  const [layouts, setLayouts] = useState(initialLayouts);

  const handleLayoutChange = (currentLayout, allLayouts) => {
    setLayouts(allLayouts);
    onUpdateProfile({ dashboardLayout: JSON.stringify(allLayouts) });
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const widgets = {
    wealth: (
      <DashboardWidget
        title="Wealth Tracking"
        icon={TrendingUp}
        color="success"
        loading={financeLoading}
      >
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
    ),
    budget: (
      <DashboardWidget
        title="Budget Health"
        icon={AccountBalance}
        color="warning"
        loading={financeLoading}
      >
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
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
                (Math.abs(financeSummary?.spending || 0) / (financeSummary?.monthlyIncome || 1)) *
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
    ),
    outlook: (
      <DashboardWidget title="Today's Outlook" icon={WbSunny} color="warning">
        <Stack
          spacing={2}
          alignItems="center"
          justifyContent="center"
          sx={{ height: '100%', py: 1 }}
        >
          <WbSunny sx={{ fontSize: '2.5rem', color: 'warning.main', opacity: 0.8 }} />
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
          </Stack>
        </Stack>
      </DashboardWidget>
    ),
    activity: (
      <DashboardWidget title="Recent Activity" icon={Event} color="info">
        <Stack spacing={0} divider={<Divider />}>
          <Box sx={{ display: 'flex', gap: 2, py: 1.5, alignItems: 'center' }}>
            <Avatar size="sm" color="success">
              <CheckCircle fontSize="small" />
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography level="title-sm">Rent Paid</Typography>
              <Typography level="body-xs">Finance • {getRelativeTime(yesterday)}</Typography>
            </Box>
            <Typography level="body-sm" fontWeight="bold">
              -{household?.currency}1,200
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, py: 1.5, alignItems: 'center' }}>
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
    ),
    tasks: (
      <DashboardWidget title="Urgent Tasks" icon={CleaningServices} color="danger">
        <Sheet
          variant="soft"
          color="neutral"
          sx={{ borderRadius: 'md', p: 2, display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}
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
    ),
    analytics: <AnalyticsWidget household={household} api={api} />,
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 1600, mx: 'auto', pb: 10 }} data-testid="dashboard-view">
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
            data-testid="greeting-text"
            sx={{
              fontSize: { xs: '2rem', md: '3.25rem' },
              mb: 0.5,
              background:
                'linear-gradient(45deg, var(--joy-palette-primary-main), var(--joy-palette-primary-400))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {greeting}, {user?.firstName || 'Friend'}
          </Typography>
          <Typography level="body-md" color="neutral">
            {new Date().toLocaleDateString('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}{' '}
            • {household?.name}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="soft"
            color="primary"
            startDecorator={<Add />}
            onClick={() => navigate('../shopping')}
            onMouseEnter={() => prefetchComponent(() => import('../features/ShoppingListView'))}
          >
            Add Item
          </Button>
          <Button
            variant="solid"
            color="primary"
            startDecorator={<Payments />}
            onClick={() => navigate('../finance')}
            onMouseEnter={() => prefetchComponent(() => import('../features/FinanceView'))}
          >
            Log Expense
          </Button>
        </Stack>
      </Box>

      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={100}
        draggableHandle=".widget-drag-handle"
        onLayoutChange={handleLayoutChange}
      >
        {Object.keys(widgets).map((key) => (
          <div key={key}>{widgets[key]}</div>
        ))}
      </ResponsiveGridLayout>
    </Box>
  );
}
