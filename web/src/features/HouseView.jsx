import { useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Grid, Card, Avatar, Divider, Stack, 
  Chip, List, ListItem, ListItemContent, ListItemDecorator, 
  Button, IconButton, Tooltip, Sheet
} from '@mui/joy';
import { 
  Home, Groups, DirectionsCar, Inventory2, 
  Wifi, Bolt, WaterDrop, Construction,
  InfoOutlined, TrendingUp, CalendarMonth,
  Add, ArrowForward, Pets, ChildCare, Person
} from '@mui/icons-material';
import { getEmojiColor } from '../theme';

const formatCurrency = (val) => (parseFloat(val) || 0).toLocaleString('en-GB', { style: 'currency', currency: 'GBP' });

const StatCard = ({ label, value, icon, color = 'primary' }) => {
    const IconComp = icon;
    return (
        <Card variant="soft" color={color} size="sm" sx={{ flex: 1, minWidth: 120 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar size="sm" variant="solid" color={color}>
                    <IconComp fontSize="small" />
                </Avatar>
                <Box>
                    <Typography level="body-xs" fontWeight="bold" sx={{ opacity: 0.8 }}>{label}</Typography>
                    <Typography level="title-md">{value}</Typography>
                </Box>
            </Stack>
        </Card>
    );
};

const ResidentGroup = ({ title, icon, members = [], isDark, navigate }) => {
    const IconComp = icon;
    if (members.length === 0) return null;
    return (
        <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, px: 1 }}>
                <IconComp fontSize="small" color="primary" />
                <Typography level="title-sm" textTransform="uppercase" letterSpacing="1px" fontWeight="bold">
                    {title} <Box component="span" sx={{ opacity: 0.5, ml: 1 }}>({members.length})</Box>
                </Typography>
            </Box>
            <Stack spacing={1}>
                {members.map(m => (
                    <Card 
                        key={m.id} 
                        variant="outlined" 
                        onClick={() => navigate(`/household/${m.household_id}/${m.type === 'pet' ? 'pets' : 'people'}/${m.id}`)}
                        sx={{ 
                            p: 1, 
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            '&:hover': { bgcolor: 'background.level1', transform: 'translateX(4px)', borderColor: 'primary.300' }
                        }}
                    >
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <Avatar size="sm" sx={{ bgcolor: getEmojiColor(m.emoji, isDark) }}>{m.emoji}</Avatar>
                            <ListItemContent>
                                <Typography level="title-sm">{m.alias || m.name}</Typography>
                                {m.dob && (
                                    <Typography level="body-xs" sx={{ opacity: 0.6 }}>
                                        {new Date().getFullYear() - new Date(m.dob).getFullYear()} Years Old
                                    </Typography>
                                )}
                            </ListItemContent>
                            <ArrowForward sx={{ fontSize: '1rem', opacity: 0.3 }} />
                        </Stack>
                    </Card>
                ))}
            </Stack>
        </Box>
    );
};

export default function HouseView() {
  const { household, members = [], vehicles = [], isDark } = useOutletContext();
  const navigate = useNavigate();

  const enabledModules = useMemo(() => {
    try {
        return household?.enabled_modules ? JSON.parse(household.enabled_modules) : ['pets', 'vehicles', 'meals'];
    } catch { return ['pets', 'vehicles', 'meals']; }
  }, [household]);

  // Group Residents
  const groups = useMemo(() => {
    return {
        adults: members.filter(m => m.type === 'adult'),
        children: members.filter(m => m.type === 'child'),
        pets: members.filter(m => m.type === 'pet')
    };
  }, [members]);

  const assetValue = household?.current_valuation || 0;
  const purchasePrice = household?.purchase_price || 0;
  const growth = assetValue - purchasePrice;

  return (
    <Box sx={{ maxWidth: '1400px', mx: 'auto', pb: 8 }}>
        {/* Header Section: The Property Passport */}
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar 
                    size="lg" 
                    variant="soft" 
                    sx={{ 
                        width: 64, height: 64, fontSize: '2.5rem',
                        bgcolor: getEmojiColor(household?.avatar || '🏠', isDark)
                    }}
                >
                    {household?.avatar || '🏠'}
                </Avatar>
                <Box>
                    <Typography level="h2">{household?.name || 'House Hub'}</Typography>
                    <Typography level="body-sm" color="neutral" startDecorator={<Home />}>
                        Built {household?.construction_year || 'N/A'} • {household?.tenure || 'Freehold'}
                    </Typography>
                </Box>
            </Box>
            <Stack direction="row" spacing={1}>
                <Button 
                    variant="outlined" color="neutral" size="sm" 
                    startDecorator={<CalendarMonth />}
                    onClick={() => navigate(`/household/${household?.id}/calendar`)}
                >
                    Calendar
                </Button>
                <Button 
                    variant="solid" color="primary" size="sm" 
                    startDecorator={<Add />}
                    onClick={() => navigate(`/household/${household?.id}/settings?tab=2`)}
                >
                    Edit House
                </Button>
            </Stack>
        </Box>

        <Grid container spacing={3}>
            {/* Left Column: Property & Inventory Stats */}
            <Grid xs={12} md={7} lg={8}>
                <Stack spacing={3}>
                    {/* Financial Overview */}
                    <Card variant="outlined" sx={{ boxShadow: 'sm' }}>
                        <Typography level="title-md" startDecorator={<TrendingUp color="success" />} sx={{ mb: 2 }}>Market Valuation</Typography>
                        <Grid container spacing={2}>
                            <Grid xs={12} sm={4}>
                                <StatCard label="Current Value" value={formatCurrency(assetValue)} icon={Home} />
                            </Grid>
                            <Grid xs={12} sm={4}>
                                <StatCard label="Purchase Price" value={formatCurrency(purchasePrice)} icon={CalendarMonth} color="neutral" />
                            </Grid>
                            <Grid xs={12} sm={4}>
                                <StatCard 
                                    label="Estimated Growth" 
                                    value={(growth >= 0 ? '+' : '') + formatCurrency(growth)} 
                                    icon={TrendingUp} 
                                    color={growth >= 0 ? 'success' : 'danger'} 
                                />
                            </Grid>
                        </Grid>
                    </Card>

                    {/* Technical Specs & Utilities */}
                    <Grid container spacing={3}>
                        <Grid xs={12} sm={6}>
                            <Card variant="outlined" sx={{ height: '100%', boxShadow: 'sm' }}>
                                <Typography level="title-md" startDecorator={<Wifi color="primary" />} sx={{ mb: 2 }}>Tech & Utilities</Typography>
                                <List size="sm" sx={{ '--ListItem-paddingLeft': '0px' }}>
                                    <ListItem>
                                        <ListItemDecorator><Wifi color="primary" /></ListItemDecorator>
                                        <ListItemContent>
                                            <Typography level="body-xs" fontWeight="bold">Broadband</Typography>
                                            <Typography level="body-sm">{household?.broadband_provider || 'Not Set'}</Typography>
                                        </ListItemContent>
                                    </ListItem>
                                    <ListItem>
                                        <ListItemDecorator><Bolt color="warning" /></ListItemDecorator>
                                        <ListItemContent>
                                            <Typography level="body-xs" fontWeight="bold">Energy Meter</Typography>
                                            <Typography level="body-sm">{household?.energy_account || 'Not Set'}</Typography>
                                        </ListItemContent>
                                    </ListItem>
                                    <ListItem>
                                        <ListItemDecorator><WaterDrop color="info" /></ListItemDecorator>
                                        <ListItemContent>
                                            <Typography level="body-xs" fontWeight="bold">Water Supply</Typography>
                                            <Typography level="body-sm">Metered Supply</Typography>
                                        </ListItemContent>
                                    </ListItem>
                                </List>
                            </Card>
                        </Grid>
                        <Grid xs={12} sm={6}>
                            <Card variant="outlined" sx={{ height: '100%', boxShadow: 'sm' }}>
                                <Typography level="title-md" startDecorator={<Construction color="neutral" />} sx={{ mb: 2 }}>Inventory Summary</Typography>
                                <Stack spacing={1.5}>
                                    {enabledModules.includes('vehicles') && (
                                        <>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Typography level="body-sm" startDecorator={<DirectionsCar />}>Fleet Size</Typography>
                                                <Chip size="sm" variant="soft" color="primary">{vehicles.length} Vehicles</Chip>
                                            </Box>
                                            <Divider />
                                        </>
                                    )}
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography level="body-sm" startDecorator={<Inventory2 />}>High Value Assets</Typography>
                                        <Chip size="sm" variant="soft" color="primary">Linked Records</Chip>
                                    </Box>
                                    <Divider />
                                    <Button 
                                        variant="plain" size="sm" 
                                        endDecorator={<ArrowForward />} 
                                        fullWidth 
                                        onClick={() => navigate('assets')}
                                        sx={{ justifyContent: 'space-between', px: 1 }}
                                    >
                                        View Full Inventory
                                    </Button>
                                </Stack>
                            </Card>
                        </Grid>
                    </Grid>
                </Stack>
            </Grid>

            {/* Right Column: Residents (Categorized) */}
            <Grid xs={12} md={5} lg={4}>
                <Sheet 
                    variant="outlined" 
                    sx={{ 
                        borderRadius: 'md', p: 2, bgcolor: 'background.surface', boxShadow: 'sm',
                        height: { xs: 'auto', md: '100%' }
                    }}
                >
                    <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography level="title-lg" startDecorator={<Groups />}>Residents</Typography>
                        <Tooltip title="Add Resident" variant="soft">
                            <IconButton size="sm" variant="plain" onClick={() => navigate(`/household/${household.id}/people/new`)}>
                                <Add />
                            </IconButton>
                        </Tooltip>
                    </Box>

                    <ResidentGroup 
                        title="Adults" 
                        icon={Person} 
                        members={groups.adults} 
                        isDark={isDark} 
                        navigate={navigate} 
                    />
                    
                    <ResidentGroup 
                        title="Children" 
                        icon={ChildCare} 
                        members={groups.children} 
                        isDark={isDark} 
                        navigate={navigate} 
                    />

                    {enabledModules.includes('pets') && (
                        <ResidentGroup 
                            title="Pets" 
                            icon={Pets} 
                            members={groups.pets} 
                            isDark={isDark} 
                            navigate={navigate} 
                        />
                    )}

                    {members.length === 0 && (
                        <Box sx={{ textAlign: 'center', py: 4, opacity: 0.5 }}>
                            <Groups sx={{ fontSize: '3rem', mb: 1 }} />
                            <Typography level="body-sm">No residents found.</Typography>
                        </Box>
                    )}
                </Sheet>
            </Grid>
        </Grid>
    </Box>
  );
}