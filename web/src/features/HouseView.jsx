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
  Add, ArrowForward, Pets, ChildCare, Person,
  Receipt, Settings, Apartment
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

const ResidentGrid = ({ title, icon, members = [], isDark, navigate, onAdd }) => {
    const IconComp = icon;
    return (
        <Card variant="outlined" sx={{ boxShadow: 'sm', mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography level="title-md" startDecorator={<IconComp color="primary" />}>
                    {title} <Box component="span" sx={{ opacity: 0.5, ml: 1, fontSize: '0.8rem' }}>({members.length})</Box>
                </Typography>
                <IconButton size="sm" variant="plain" onClick={onAdd} color="primary"><Add /></IconButton>
            </Box>
            <Grid container spacing={2}>
                {members.length === 0 && (
                    <Grid xs={12}>
                        <Typography level="body-sm" color="neutral" textAlign="center" sx={{ py: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 'sm' }}>
                            No {title.toLowerCase()} recorded.
                        </Typography>
                    </Grid>
                )}
                {members.map(m => (
                    <Grid key={m.id} xs={12} sm={6}>
                        <Sheet 
                            variant="soft" 
                            onClick={() => navigate(`/household/${m.household_id}/${m.type === 'pet' ? 'pets' : 'people'}/${m.id}`)}
                            sx={{ 
                                p: 1.5, borderRadius: 'md', display: 'flex', alignItems: 'center', gap: 2,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                '&:hover': { bgcolor: 'primary.softBg', transform: 'translateX(4px)' }
                            }}
                        >
                            <Avatar size="md" sx={{ bgcolor: getEmojiColor(m.emoji, isDark) }}>{m.emoji}</Avatar>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography level="title-sm" noWrap>{m.alias || m.name}</Typography>
                                {m.dob && (
                                    <Typography level="body-xs" sx={{ opacity: 0.6 }}>
                                        {new Date().getFullYear() - new Date(m.dob).getFullYear()} Years Old
                                    </Typography>
                                )}
                            </Box>
                            <IconButton size="sm" variant="plain"><ArrowForward fontSize="small" /></IconButton>
                        </Sheet>
                    </Grid>
                ))}
            </Grid>
        </Card>
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

  // Group Residents (Strictly Excluding Pets from People groups)
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
                    variant="outlined" color="neutral" size="sm" 
                    startDecorator={<Settings />}
                    onClick={() => navigate(`/household/${household?.id}/settings?tab=2`)}
                >
                    Settings
                </Button>
                <Button 
                    variant="outlined" color="primary" size="sm" 
                    startDecorator={<Apartment />}
                    onClick={() => navigate(`/household/${household?.id}/assets/new`)}
                >
                    Add Property
                </Button>
                <Button 
                    variant="solid" color="primary" size="sm" 
                    startDecorator={<Receipt />}
                    onClick={() => navigate(`/household/${household?.id}/finance?tab=charges`)}
                >
                    Bills & Costs
                </Button>
            </Stack>
        </Box>

        <Grid container spacing={3}>
            {/* Main Content Area */}
            <Grid xs={12} md={8}>
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

                    {/* Residents Section (Unifying styling) */}
                    <ResidentGrid title="Adults" icon={Person} members={groups.adults} isDark={isDark} navigate={navigate} onAdd={() => navigate(`/household/${household.id}/people/new`)} />
                    <ResidentGrid title="Children" icon={ChildCare} members={groups.children} isDark={isDark} navigate={navigate} onAdd={() => navigate(`/household/${household.id}/people/new`)} />

                    {/* Fleet Section */}
                    {enabledModules.includes('vehicles') && (
                        <Card variant="outlined" sx={{ boxShadow: 'sm' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography level="title-md" startDecorator={<DirectionsCar color="primary" />}>Fleet & Vehicles <Box component="span" sx={{ opacity: 0.5, ml: 1, fontSize: '0.8rem' }}>({vehicles.length})</Box></Typography>
                                <IconButton size="sm" variant="plain" onClick={() => navigate(`/household/${household.id}/vehicles/new`)} color="primary"><Add /></IconButton>
                            </Box>
                            <Grid container spacing={2}>
                                {vehicles.length === 0 && (
                                    <Grid xs={12}>
                                        <Typography level="body-sm" color="neutral" textAlign="center" sx={{ py: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 'sm' }}>
                                            No vehicles registered.
                                        </Typography>
                                    </Grid>
                                )}
                                {vehicles.map(v => (
                                    <Grid key={v.id} xs={12} sm={6}>
                                        <Sheet variant="soft" sx={{ p: 1.5, borderRadius: 'md', display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer', transition: 'all 0.2s', '&:hover': { bgcolor: 'primary.softBg', transform: 'translateX(4px)' } }} onClick={() => navigate(`/household/${household.id}/vehicles/${v.id}`)}>
                                            <Avatar size="md" sx={{ bgcolor: getEmojiColor(v.emoji || '🚗', isDark) }}>{v.emoji || '🚗'}</Avatar>
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography level="title-sm" noWrap>{v.make} {v.model}</Typography>
                                                <Typography level="body-xs" color="neutral">{v.registration || 'No Plate'}</Typography>
                                            </Box>
                                            <IconButton size="sm" variant="plain"><ArrowForward fontSize="small" /></IconButton>
                                        </Sheet>
                                    </Grid>
                                ))}
                            </Grid>
                        </Card>
                    )}

                    {/* Pets Summary Section */}
                    {enabledModules.includes('pets') && (
                        <Card variant="outlined" sx={{ boxShadow: 'sm' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography level="title-md" startDecorator={<Pets color="primary" />}>Pets & Animals <Box component="span" sx={{ opacity: 0.5, ml: 1, fontSize: '0.8rem' }}>({groups.pets.length})</Box></Typography>
                                <IconButton size="sm" variant="plain" onClick={() => navigate(`/household/${household.id}/pets/new`)} color="primary"><Add /></IconButton>
                            </Box>
                            <Grid container spacing={2}>
                                {groups.pets.length === 0 && (
                                    <Grid xs={12}>
                                        <Typography level="body-sm" color="neutral" textAlign="center" sx={{ py: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 'sm' }}>
                                            No pets found.
                                        </Typography>
                                    </Grid>
                                )}
                                {groups.pets.map(p => (
                                    <Grid key={p.id} xs={12} sm={6}>
                                        <Sheet variant="soft" sx={{ p: 1.5, borderRadius: 'md', display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer', transition: 'all 0.2s', '&:hover': { bgcolor: 'primary.softBg', transform: 'translateX(4px)' } }} onClick={() => navigate(`/household/${household.id}/pets/${p.id}`)}>
                                            <Avatar size="md" sx={{ bgcolor: getEmojiColor(p.emoji || '🐾', isDark) }}>{p.emoji || '🐾'}</Avatar>
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography level="title-sm" noWrap>{p.name}</Typography>
                                                <Typography level="body-xs" color="neutral">{p.species} • {p.breed || 'Mixed'}</Typography>
                                            </Box>
                                            <IconButton size="sm" variant="plain"><ArrowForward fontSize="small" /></IconButton>
                                        </Sheet>
                                    </Grid>
                                ))}
                            </Grid>
                        </Card>
                    )}
                </Stack>
            </Grid>

            {/* Sidebar Column: Utils & Assets */}
            <Grid xs={12} md={4}>
                <Stack spacing={3}>
                    {/* Technical Specs & Utilities */}
                    <Card variant="outlined" sx={{ boxShadow: 'sm' }}>
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

                    {/* Inventory Summary */}
                    <Card variant="outlined" sx={{ boxShadow: 'sm' }}>
                        <Typography level="title-md" startDecorator={<Construction color="neutral" />} sx={{ mb: 2 }}>Inventory Summary</Typography>
                        <Stack spacing={1.5}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography level="body-sm" startDecorator={<Inventory2 />}>High Value Assets</Typography>
                                <Chip size="sm" variant="soft" color="primary">Linked Records</Chip>
                            </Box>
                            <Divider />
                            <Button 
                                variant="plain" size="sm" 
                                endDecorator={<ArrowForward />} 
                                fullWidth 
                                onClick={() => navigate(`/household/${household.id}/house/assets`)}
                                sx={{ justifyContent: 'space-between', px: 1 }}
                            >
                                View Full Inventory
                            </Button>
                        </Stack>
                    </Card>
                </Stack>
            </Grid>
        </Grid>
    </Box>
  );
}