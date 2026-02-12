import React, { useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { 
  Box, Typography, Grid, Card, AspectRatio, IconButton, 
  Stack, Divider, Sheet, Button
} from '@mui/joy';
import { 
  AccountBalance, Event, RestaurantMenu, ShoppingBag, 
  Groups, DirectionsCar, Settings, ArrowForward,
  Payments, CleaningServices, HomeWork, Inventory2
} from '@mui/icons-material';
import AppHeader from '../components/ui/AppHeader';

/**
 * HEARTHSIDE Homepage
 * Replaces the complex widget dashboard with a clean, high-performance modular entry point.
 */
export default function HomeView() {
  const navigate = useNavigate();
  const { household, user, members = [], vehicles = [] } = useOutletContext();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const dateStr = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  const MODULES = useMemo(() => [
    { 
        id: 'finance', label: 'Finance', icon: AccountBalance, color: 'success', 
        path: 'finance', desc: 'Budget & Assets', emoji: '💰' 
    },
    { 
        id: 'calendar', label: 'Calendar', icon: Event, color: 'danger', 
        path: 'calendar', desc: 'Events & Renewals', emoji: '📅' 
    },
    { 
        id: 'meals', label: 'Meals', icon: RestaurantMenu, color: 'warning', 
        path: 'meals', desc: 'Weekly Planner', emoji: '🍝' 
    },
    { 
        id: 'shopping', label: 'Shopping', icon: ShoppingBag, color: 'primary', 
        path: 'shopping', desc: 'Grocery List', emoji: '🛒' 
    },
    { 
        id: 'people', label: 'People', icon: Groups, color: 'neutral', 
        path: 'people', desc: 'Resident Directory', emoji: '👤' 
    },
    { 
        id: 'house', label: 'House', icon: HomeWork, color: 'neutral', 
        path: 'house', desc: 'Property Hub', emoji: '🏠' 
    },
    { 
        id: 'vehicles', label: 'Vehicles', icon: DirectionsCar, color: 'warning', 
        path: 'vehicles', desc: 'Fleet Status', emoji: '🚗' 
    },
    { 
        id: 'chores', label: 'Chores', icon: CleaningServices, color: 'info', 
        path: 'chores', desc: 'Task Management', emoji: '🧹' 
    }
  ], []);

  const householdStats = useMemo(() => [
      { label: 'Residents', value: members.length, icon: Groups },
      { label: 'Vehicles', value: vehicles.length, icon: DirectionsCar },
      { label: 'Assets', value: 'Active', icon: Inventory2 }
  ], [members, vehicles]);

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', pb: 10 }}>
      {/* Welcome Header */}
      <Box sx={{ mb: 6, pt: 2 }}>
        <Typography level="h1" sx={{ fontSize: { xs: '2.5rem', md: '3.5rem' }, mb: 1 }}>
            {greeting}, {user?.first_name || 'Friend'}
        </Typography>
        <Typography level="body-lg" color="neutral" sx={{ opacity: 0.8 }}>
            {dateStr} • {household?.name || 'HEARTHSTONE Household'}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Module Grid */}
        <Grid xs={12} md={8}>
            <Typography level="title-md" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: '1px' }}>
                Quick Navigation
            </Typography>
            <Grid container spacing={2}>
                {MODULES.map((mod) => (
                    <Grid xs={6} sm={4} key={mod.id}>
                        <Card 
                            variant="outlined" 
                            onClick={() => navigate(`../${mod.path}`)}
                            sx={{ 
                                p: 2, 
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                '&:hover': { 
                                    bgcolor: 'background.level1',
                                    transform: 'translateY(-4px)',
                                    boxShadow: 'md',
                                    borderColor: `${mod.color}.300`
                                }
                            }}
                        >
                            <AspectRatio ratio="1" variant="soft" color={mod.color} sx={{ borderRadius: 'md', mb: 2, width: 48 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <mod.icon />
                                </Box>
                            </AspectRatio>
                            <Box>
                                <Typography level="title-md">{mod.label}</Typography>
                                <Typography level="body-xs" color="neutral">{mod.desc}</Typography>
                            </Box>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Grid>

        {/* Status Column */}
        <Grid xs={12} md={4}>
            <Stack spacing={3}>
                <Typography level="title-md" sx={{ mb: -1, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Household Pulse
                </Typography>
                
                <Sheet variant="outlined" sx={{ p: 2, borderRadius: 'md', bgcolor: 'background.level1' }}>
                    <Stack spacing={2} divider={<Divider />}>
                        {householdStats.map((stat, idx) => (
                            <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <stat.icon color="primary" sx={{ opacity: 0.7 }} />
                                    <Typography level="body-sm">{stat.label}</Typography>
                                </Box>
                                <Typography level="title-sm" fontWeight="bold">{stat.value}</Typography>
                            </Box>
                        ))}
                    </Stack>
                </Sheet>

                <Card variant="solid" color="primary" invertedColors sx={{ boxShadow: 'lg' }}>
                    <Typography level="title-lg">HEARTHSTONE System</Typography>
                    <Typography level="body-sm">
                        Everything is running smoothly. Your local data is encrypted and secure.
                    </Typography>
                    <Button 
                        variant="soft" 
                        size="sm" 
                        endDecorator={<ArrowForward />} 
                        onClick={() => navigate('../settings')}
                        sx={{ mt: 1, alignSelf: 'flex-start' }}
                    >
                        Settings
                    </Button>
                </Card>

                <Sheet variant="soft" color="neutral" sx={{ p: 2, borderRadius: 'md', textAlign: 'center' }}>
                    <Typography level="body-xs" color="neutral">
                        Dashboard widgets are currently being overhauled. Full customization will return in a future update.
                    </Typography>
                </Sheet>
            </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}