import { useState, useEffect, useMemo } from 'react';
import { 
  Box, Typography, Sheet, Tabs, TabList, Tab, TabPanel, Button, Input, 
  FormControl, FormLabel, Stack, Avatar, IconButton, 
  Divider, Modal, ModalDialog, DialogTitle, Select, Option, Grid, Chip, DialogContent, DialogActions, Tooltip, Switch
} from '@mui/joy';
import { 
  PersonAdd, Edit, Delete, ExitToApp, ToggleOn, ToggleOff,
  OpenInNew, Info, Verified, Code, Policy, Palette, AddHome, LightMode, DarkMode,
  ViewModule, CheckCircle, Cancel, Public, ContentCopy, Update, HealthAndSafety
} from '@mui/icons-material';
import { getEmojiColor, THEMES } from '../theme';
import EmojiPicker from '../components/EmojiPicker';
import AppSelect from '../components/ui/AppSelect';
import pkg from '../../package.json';
import gitInfo from '../git-info.json';

export default function SettingsView({ 
    household, users, currentUser, api, showNotification, confirmAction, fetchHhUsers,
    themeId, onThemeChange, onUpdateHousehold
}) {
  const [activeTab, setActiveTab] = useState(0);
  const [editUser, setEditUser] = useState(null);
  const [isInvite, setIsInvite] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  // New Household Modal State
  const [isCreateHhModalOpen, setIsCreateHhModalOpen] = useState(false);
  const [newHhName, setNewHhName] = useState('');
  const [isCreatingHh, setIsCreatingHh] = useState(false);

  // Invite Success Modal
  const [inviteSuccess, setInviteSuccess] = useState(null); // { email, password }
  
  // Regional Settings State
  const [regionalSettings, setRegionalSettings] = useState({
      currency: '£',
      date_format: 'dd/MM/yyyy',
      decimals: 2
  });
  
  // Modules State
  const [enabledModules, setEnabledModules] = useState(['pets', 'vehicles', 'meals']);

  // Nightly Test Results State
  const [testResults, setTestResults] = useState([]);
  const [loadingTests, setLoadingTests] = useState(false);
  const [testTab, setTestTab] = useState(0);
  const [nightlyVersionFilter, setNightlyVersionFilter] = useState('');

  const availableVersions = useMemo(() => {
    const versions = new Set(testResults.map(r => r.version).filter(Boolean));
    versions.add(pkg.version); // Always include current version
    return Array.from(versions).sort((a, b) => b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' }));
  }, [testResults]);

  useEffect(() => {
    if (activeTab === 6 && isAdmin) {
      fetchTestResults();
    }
  }, [activeTab]);

  const fetchTestResults = async () => {
    setLoadingTests(true);
    try {
      const res = await api.get('/admin/test-results');
      setTestResults(res.data);
    } catch {
      showNotification("Failed to fetch test results.", "danger");
    } finally {
      setLoadingTests(false);
    }
  };

  useEffect(() => {
      if (household) {
          try {
              if (household.enabled_modules) {
                  setEnabledModules(JSON.parse(household.enabled_modules));
              }
              setNightlyVersionFilter(household.nightly_version_filter || '');
              setRegionalSettings({
                  currency: household.currency || '£',
                  date_format: household.date_format || 'dd/MM/yyyy',
                  decimals: household.decimals !== undefined ? household.decimals : 2
              });
           } catch {
              // Fallback
          }
      }
  }, [household]);

  // Controlled form state for the modal
  const [formData, setFormData] = useState({
      email: '',
      role: 'member',
      first_name: '',
      last_name: '',
      avatar: '👤'
  });

  const isAdmin = currentUser?.role === 'admin';

  const groupedThemes = useMemo(() => {
    const groups = { light: [], dark: [] };
    Object.entries(THEMES).forEach(([id, spec]) => {
      groups[spec.mode].push({ id, ...spec });
    });
    return groups;
  }, []);

  useEffect(() => {
      if (editUser) {
          setFormData({
              email: editUser.email || '',
              role: editUser.role || 'member',
              first_name: editUser.first_name || '',
              last_name: editUser.last_name || '',
              avatar: editUser.avatar || '👤'
          });
      }
  }, [editUser]);

  const toggleModule = async (module) => {
    if (!isAdmin) return;
    
    const newModules = enabledModules.includes(module) 
        ? enabledModules.filter(m => m !== module)
        : [...enabledModules, module];
    
    // Optimistically update local state
    setEnabledModules(newModules);
    
    try {
        // Use parent handler to update global state without reload
        await onUpdateHousehold({ 
            enabled_modules: JSON.stringify(newModules) 
        });
        // Parent handles notification ("Household updated")
     } catch {
        // Revert on failure
        setEnabledModules(enabledModules);
    }
  };

  const handleSaveRegional = async () => {
    if (!isAdmin) return;
    try {
        await onUpdateHousehold(regionalSettings);
        // Notification handled by parent
     } catch {
        showNotification("Failed to save regional settings.", "danger");
    }
  };

  const handleToggleActivation = async (u) => {
    if (!isAdmin) return;
    try {
      await api.put(`/households/${household.id}/users/${u.id}`, { is_active: !u.is_active });
      showNotification(`User ${u.is_active ? 'deactivated' : 'activated'}.`, "success");
      if (fetchHhUsers) fetchHhUsers(household.id);
      else window.location.reload(); 
     } catch {
      showNotification("Failed to update user status.", "danger");
    }
  };

  const handleRemoveUser = (userId, name) => {
    confirmAction(
        userId === currentUser.id ? "Leave Household" : "Remove User",
        `Are you sure you want to remove ${name} from '${household.name}'?`,
        async () => {
            try {
                await api.delete(`/households/${household.id}/users/${userId}`);
                showNotification("User removed.", "success");
                if (userId === currentUser.id) window.location.href = '/select-household';
                else if (fetchHhUsers) fetchHhUsers(household.id);
                else window.location.reload();
             } catch {
                showNotification("Failed to remove user.", "danger");
            }
        }
    );
  };

  const handleSaveUser = async (e) => {
      e.preventDefault();
      setSavingUser(true);
      try {
          if (isInvite) {
              const res = await api.post(`/households/${household.id}/users`, formData);
              showNotification("User invited successfully.", "success");
              
              if (res.data.generatedPassword) {
                  setInviteSuccess({
                      email: formData.email,
                      password: res.data.generatedPassword
                  });
              }
          } else {
              await api.put(`/households/${household.id}/users/${editUser.id}`, formData);
              showNotification("User updated successfully.", "success");
          }
          setEditUser(null);
          if (fetchHhUsers) fetchHhUsers(household.id);
          else window.location.reload();
       } catch {
          showNotification("Failed to save user.", "danger");
      } finally {
          setSavingUser(false);
      }
  };

  const handleCreateNewHousehold = async (e) => {
    e.preventDefault();
    if (!newHhName.trim()) return;
    setIsCreatingHh(true);
    try {
      const res = await api.post('/households', { 
        name: newHhName
      });
      showNotification(`Household "${newHhName}" created successfully.`, "success");
      setIsCreateHhModalOpen(false);
      setNewHhName('');
      
      // Navigate to the new household
      window.location.href = `/household/${res.data.id}/dashboard`;
     } catch {
      showNotification("Failed to create new household.", "danger");
    } finally {
      setIsCreatingHh(false);
    }
  };

  const openEditUser = (u) => { 
    setEditUser(u); 
    setIsInvite(false); 
  };
  const openAddUser = () => { 
    setEditUser({ email: '', role: 'member', first_name: '', last_name: '', avatar: '👤' }); 
    setIsInvite(true); 
  };

  const getRoleColor = (role) => {
      switch(role) {
          case 'admin': return 'primary';
          case 'member': return 'neutral';
          case 'viewer': return 'success';
          default: return 'neutral';
      }
  };

  const ThemeGrid = ({ themes }) => (
    <Grid container spacing={2}>
        {themes.map((spec) => (
            <Grid key={spec.id} xs={6} sm={4} md={3} lg={2.4}>
                <Sheet
                    variant={themeId === spec.id ? 'solid' : 'outlined'}
                    color={themeId === spec.id ? 'primary' : 'neutral'}
                    onClick={() => onThemeChange(spec.id)}
                    sx={{
                        p: 1.5, borderRadius: 'md', cursor: 'pointer', height: '100%',
                        transition: 'all 0.2s',
                        '&:hover': { transform: 'translateY(-2px)', boxShadow: 'sm' },
                        position: 'relative',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center'
                    }}
                >
                    <Box sx={{ 
                        display: 'flex', width: '100%', height: 32, borderRadius: 'sm', 
                        overflow: 'hidden', mb: 1, border: '1px solid rgba(0,0,0,0.1)',
                        bgcolor: 'background.surface'
                    }}>
                        <Tooltip title="Primary" variant="soft" size="sm"><Box sx={{ flex: 1, bgcolor: spec.primary }} /></Tooltip>
                        <Tooltip title="Background" variant="soft" size="sm"><Box sx={{ flex: 1, bgcolor: spec.bg }} /></Tooltip>
                        <Tooltip title="Surface" variant="soft" size="sm"><Box sx={{ flex: 1, bgcolor: spec.surface }} /></Tooltip>
                        <Tooltip title="Selection" variant="soft" size="sm"><Box sx={{ flex: 1, bgcolor: spec.selection }} /></Tooltip>
                        <Tooltip title="Text" variant="soft" size="sm"><Box sx={{ flex: 1, bgcolor: spec.text }} /></Tooltip>
                    </Box>
                    <Typography level="title-sm" noWrap sx={{ fontSize: '13px', color: themeId === spec.id ? '#fff' : 'text.primary', width: '100%' }}>{spec.name}</Typography>
                    {themeId === spec.id && (
                        <Palette sx={{ position: 'absolute', top: 6, right: 6, fontSize: '0.7rem', color: '#fff' }} />
                    )}
                </Sheet>
            </Grid>
        ))}
    </Grid>
  );
  
  // Dynamic Tab Style to enforce theme color on text
  const getTabStyle = (index) => ({
      flex: 'none',
      color: activeTab === index ? 'var(--joy-palette-primary-plainColor)' : undefined
  });

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>
            Household Settings
          </Typography>
          <Typography level="body-md" color="neutral">
            Manage members and technical configuration for <b>{household?.name}</b>.
          </Typography>
        </Box>
        {isAdmin && (
          <Button 
            variant="soft" 
            color="primary" 
            startDecorator={<AddHome />}
            onClick={() => setIsCreateHhModalOpen(true)}
          >
            New Household
          </Button>
        )}
      </Box>

      <Sheet variant="outlined" sx={{ borderRadius: 'md', minHeight: 500, overflow: 'hidden' }}>
        <Tabs value={activeTab} onChange={(_e, v) => setActiveTab(v)} sx={{ bgcolor: 'transparent' }}>
          <TabList 
            variant="plain" 
            sx={{ 
                p: 1, gap: 1, borderRadius: 'md', bgcolor: 'background.level1', mx: 2, mt: 2,
                overflowX: 'auto', 
                flexWrap: 'nowrap',
                scrollbarWidth: 'none', 
                '&::-webkit-scrollbar': { display: 'none' }
            }}
          >
            <Tab value={0} variant={activeTab === 0 ? 'solid' : 'plain'} color={activeTab === 0 ? 'primary' : 'neutral'} sx={getTabStyle(0)}>User Access</Tab>
            <Tab value={1} variant={activeTab === 1 ? 'solid' : 'plain'} color={activeTab === 1 ? 'primary' : 'neutral'} sx={getTabStyle(1)}>Appearance</Tab>
            <Tab value={2} variant={activeTab === 2 ? 'solid' : 'plain'} color={activeTab === 2 ? 'primary' : 'neutral'} sx={getTabStyle(2)}>Regional</Tab>
            <Tab value={3} variant={activeTab === 3 ? 'solid' : 'plain'} color={activeTab === 3 ? 'primary' : 'neutral'} sx={getTabStyle(3)}>Modules</Tab>
            <Tab value={4} variant={activeTab === 4 ? 'solid' : 'plain'} color={activeTab === 4 ? 'primary' : 'neutral'} sx={getTabStyle(4)}>Developers</Tab>
            {isAdmin && <Tab value={6} variant={activeTab === 6 ? 'solid' : 'plain'} color={activeTab === 6 ? 'primary' : 'neutral'} sx={getTabStyle(6)}>Nightly Health</Tab>}
            <Tab value={5} variant={activeTab === 5 ? 'solid' : 'plain'} color={activeTab === 5 ? 'primary' : 'neutral'} sx={getTabStyle(5)}>About</Tab>
          </TabList>

          <Box sx={{ p: { xs: 2, md: 4 } }}>
            {activeTab === 6 && isAdmin && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                  <Box>
                    <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>Nightly Health Monitor</Typography>
                    <Typography level="body-md" color="neutral">System-wide test results from the nightly CI suite, ordered newest to oldest.</Typography>
                  </Box>
                  <Button variant="soft" color="primary" startDecorator={<Update />} onClick={fetchTestResults} loading={loadingTests}>Refresh</Button>
                </Box>

                <Sheet variant="outlined" sx={{ p: 3, borderRadius: 'md', mb: 4, bgcolor: 'background.level1' }}>
                  <Typography level="title-md" sx={{ mb: 2 }} startDecorator={<HealthAndSafety color="primary" />}>Configuration</Typography>
                  <Grid container spacing={3} alignItems="flex-end">
                    <Grid xs={12} sm={8} md={6}>
                      <AppSelect
                        label="Nightly Version Filter"
                        value={nightlyVersionFilter}
                        onChange={(v) => setNightlyVersionFilter(v)}
                        options={[
                          { value: '', label: 'All Versions' },
                          ...availableVersions.map(v => ({ value: v, label: `v${v}` }))
                        ]}
                        helperText="Specify the project version that the nightly suite should target."
                      />
                    </Grid>
                    <Grid xs={12} sm={4}>
                      <Button 
                        variant="solid" 
                        color="primary" 
                        onClick={async () => {
                          try {
                            await onUpdateHousehold({ nightly_version_filter: nightlyVersionFilter });
                          } catch {
                            showNotification("Failed to save nightly configuration.", "danger");
                          }
                        }}
                      >
                        Save Configuration
                      </Button>
                    </Grid>
                  </Grid>
                </Sheet>

                <Tabs value={testTab} onChange={(_e, v) => setTestTab(v)} sx={{ bgcolor: 'transparent' }}>
                  <TabList variant="plain" sx={{ mb: 2, gap: 1 }}>
                    <Tab value={0} variant={testTab === 0 ? 'soft' : 'plain'} color="primary">Backend API Tests</Tab>
                    <Tab value={1} variant={testTab === 1 ? 'soft' : 'plain'} color="primary">Frontend E2E Tests</Tab>
                  </TabList>
                  
                  {[0, 1].map((idx) => {
                    const type = idx === 0 ? 'backend' : 'frontend';
                    const results = testResults.filter(r => {
                      const typeMatch = r.test_type === type;
                      const versionMatch = !nightlyVersionFilter || r.version === nightlyVersionFilter;
                      return typeMatch && versionMatch;
                    });
                    
                    return (
                      <TabPanel key={idx} value={idx}>
                        <Sheet variant="outlined" sx={{ borderRadius: 'md', overflow: 'auto' }}>
                          <Box sx={{ p: 2, bgcolor: 'background.level1', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', gap: 2 }}>
                             <Chip variant="soft" color="neutral">Latest Run: {results[0] ? new Date(results[0].created_at).toLocaleString() : 'N/A'}</Chip>
                             {results[0] && (
                               <>
                                 <Chip variant="soft" color={results[0].fails === 0 ? "success" : "danger"} startDecorator={results[0].fails === 0 ? <CheckCircle /> : <Cancel />}>
                                   {results[0].fails === 0 ? "All Passed" : `${results[0].fails} Failures`}
                                 </Chip>
                                 <Chip variant="soft" color="neutral">{results[0].passes} Passes</Chip>
                               </>
                             )}
                          </Box>
                          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                              <tr>
                                <th style={{ padding: '12px', borderBottom: '1px solid var(--joy-palette-divider)' }}>Date</th>
                                <th style={{ padding: '12px', borderBottom: '1px solid var(--joy-palette-divider)' }}>Suite</th>
                                <th style={{ padding: '12px', borderBottom: '1px solid var(--joy-palette-divider)' }}>Version</th>
                                <th style={{ padding: '12px', borderBottom: '1px solid var(--joy-palette-divider)' }}>Status</th>
                                <th style={{ padding: '12px', borderBottom: '1px solid var(--joy-palette-divider)' }}>Passes</th>
                                <th style={{ padding: '12px', borderBottom: '1px solid var(--joy-palette-divider)' }}>Fails</th>
                                <th style={{ padding: '12px', borderBottom: '1px solid var(--joy-palette-divider)' }}>Duration</th>
                              </tr>
                            </thead>
                            <tbody>
                              {results.map(r => (
                                <tr key={r.id}>
                                  <td style={{ padding: '12px', borderBottom: '1px solid var(--joy-palette-divider)' }}>
                                    <Typography level="body-sm">{new Date(r.created_at).toLocaleString()}</Typography>
                                  </td>
                                  <td style={{ padding: '12px', borderBottom: '1px solid var(--joy-palette-divider)' }}>
                                    <Typography level="body-sm" sx={{ fontWeight: 'bold' }}>{r.suite_name}</Typography>
                                  </td>
                                  <td style={{ padding: '12px', borderBottom: '1px solid var(--joy-palette-divider)' }}>
                                    <Typography level="body-sm" sx={{ fontFamily: 'monospace' }}>v{r.version || 'N/A'}</Typography>
                                  </td>
                                  <td style={{ padding: '12px', borderBottom: '1px solid var(--joy-palette-divider)' }}>
                                    <Chip 
                                      size="sm" 
                                      variant="soft" 
                                      color={r.fails === 0 ? "success" : "danger"}
                                      startDecorator={r.fails === 0 ? <CheckCircle /> : <Cancel />}
                                    >
                                      {r.fails === 0 ? "Passed" : "Failed"}
                                    </Chip>
                                  </td>
                                  <td style={{ padding: '12px', borderBottom: '1px solid var(--joy-palette-divider)' }}>
                                    <Typography level="body-sm" color="success">{r.passes}</Typography>
                                  </td>
                                  <td style={{ padding: '12px', borderBottom: '1px solid var(--joy-palette-divider)' }}>
                                    <Typography level="body-sm" color={r.fails > 0 ? "danger" : "neutral"}>{r.fails}</Typography>
                                  </td>
                                  <td style={{ padding: '12px', borderBottom: '1px solid var(--joy-palette-divider)' }}>
                                    <Typography level="body-xs" sx={{ fontFamily: 'monospace' }}>{r.duration?.toFixed(2)}s</Typography>
                                  </td>
                                </tr>
                              ))}
                              {results.length === 0 && (
                                <tr>
                                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center' }}>
                                    <Typography level="body-md" color="neutral">No test results recorded yet for this version.</Typography>
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </Sheet>
                      </TabPanel>
                    );
                  })}
                </Tabs>
              </Box>
            )}

            {activeTab === 0 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                    <Box>
                        <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>Member Permissions</Typography>
                        <Typography level="body-md" color="neutral">Control who has access to this household and their level of control.</Typography>
                    </Box>
                    {isAdmin && <Button variant="solid" color="primary" startDecorator={<PersonAdd />} onClick={openAddUser}>Invite User</Button>}
                </Box>
                
                <Stack spacing={2}>
                    {users.map(u => (
                        <Sheet key={u.id} variant="outlined" sx={{ p: 2, borderRadius: 'md', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Stack direction="row" spacing={2} alignItems="center">
                                <Avatar sx={{ bgcolor: getEmojiColor(u.avatar || u.first_name?.[0], false) }}>{u.avatar || u.first_name?.[0]}</Avatar>
                                <Box>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Typography level="title-sm" sx={{ fontWeight: 'lg' }}>{u.first_name} {u.last_name} {u.id === currentUser.id && '(You)'}</Typography>
                                        <Chip size="sm" variant="soft" color={getRoleColor(u.role)} sx={{ textTransform: 'uppercase', fontWeight: 'bold', fontSize: '10px' }}>
                                            {u.role}
                                        </Chip>
                                    </Stack>
                                    <Typography level="body-xs" color="neutral">{u.email}</Typography>
                                </Box>
                            </Stack>
                            <Stack direction="row" spacing={1}>
                                {isAdmin && currentUser.id !== u.id && (
                                    <IconButton size="sm" color={u.is_active ? "warning" : "success"} onClick={() => handleToggleActivation(u)}>
                                        {u.is_active ? <ToggleOn /> : <ToggleOff />}
                                    </IconButton>
                                )}
                                {isAdmin && (
                                    <IconButton size="sm" color="primary" onClick={() => openEditUser(u)}>
                                        <Edit fontSize="small" />
                                    </IconButton>
                                )}
                                {currentUser.id !== u.id ? (
                                    isAdmin && (
                                        <IconButton size="sm" color="danger" onClick={() => handleRemoveUser(u.id, u.first_name || u.email)}>
                                            <Delete fontSize="small" />
                                        </IconButton>
                                    )
                                ) : (
                                    <IconButton size="sm" color="warning" onClick={() => handleRemoveUser(u.id, 'yourself')}>
                                        <ExitToApp fontSize="small" />
                                    </IconButton>
                                )}
                            </Stack>
                        </Sheet>
                    ))}
                </Stack>
              </Box>
            )}

            {activeTab === 1 && (
                <Box>
                    <Box sx={{ mb: 4 }}>
                        <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>Personalize Your Experience</Typography>
                        <Typography level="body-md" color="neutral">Select from our library of 50+ themes. Your preference is saved to your profile and follows you across devices.</Typography>
                    </Box>

                    <Stack spacing={4}>
                      <Box>
                        <Typography level="title-lg" startDecorator={<LightMode color="warning" />} sx={{ mb: 2 }}>Light Themes</Typography>
                        <ThemeGrid themes={groupedThemes.light} />
                      </Box>
                      <Divider />
                      <Box>
                        <Typography level="title-lg" startDecorator={<DarkMode color="primary" />} sx={{ mb: 2 }}>Dark Themes</Typography>
                        <ThemeGrid themes={groupedThemes.dark} />
                      </Box>
                    </Stack>
                </Box>
            )}

            {activeTab === 2 && (
                <Box>
                    <Box sx={{ mb: 4 }}>
                        <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>Regional Settings</Typography>
                        <Typography level="body-md" color="neutral">Configure currency, date formats, and localization preferences.</Typography>
                    </Box>

                    <Stack spacing={3} sx={{ maxWidth: 500 }}>
                        <AppSelect 
                            label="Currency Symbol" 
                            value={regionalSettings.currency} 
                            onChange={(v) => setRegionalSettings({...regionalSettings, currency: v})}
                            options={[
                                { value: '£', label: '£ (GBP) - Pound Sterling' },
                                { value: '$', label: '$ (USD) - US Dollar' },
                                { value: '€', label: '€ (EUR) - Euro' },
                                { value: '¥', label: '¥ (JPY) - Japanese Yen' },
                                { value: '₹', label: '₹ (INR) - Indian Rupee' },
                                { value: 'R', label: 'R (ZAR) - South African Rand' }
                            ]}
                            disabled={!isAdmin}
                        />
                        <AppSelect 
                            label="Date Format" 
                            value={regionalSettings.date_format} 
                            onChange={(v) => setRegionalSettings({...regionalSettings, date_format: v})}
                            options={[
                                { value: 'dd/MM/yyyy', label: 'DD/MM/YYYY (UK/EU)' },
                                { value: 'MM/dd/yyyy', label: 'MM/DD/YYYY (US)' },
                                { value: 'yyyy-MM-dd', label: 'YYYY-MM-DD (ISO)' }
                            ]}
                            disabled={!isAdmin}
                        />
                        <AppSelect 
                            label="Currency Precision (Decimals)" 
                            value={regionalSettings.decimals.toString()} 
                            onChange={(v) => setRegionalSettings({...regionalSettings, decimals: parseInt(v)})}
                            options={[
                                { value: '0', label: '0 (e.g. £10)' },
                                { value: '2', label: '2 (e.g. £10.00)' }
                            ]}
                            disabled={!isAdmin}
                        />

                        <Sheet variant="soft" color="neutral" sx={{ p: 2, borderRadius: 'sm', bgcolor: 'background.level1' }}>
                            <Typography level="title-sm" sx={{ mb: 1 }}>Preview</Typography>
                            <Grid container spacing={2}>
                                <Grid xs={6}>
                                    <Typography level="body-xs">Currency</Typography>
                                    <Typography level="body-md" sx={{ fontFamily: 'monospace' }}>
                                        {regionalSettings.currency}1,234{regionalSettings.decimals > 0 ? '.' + '99'.padEnd(regionalSettings.decimals, '0') : ''}
                                    </Typography>
                                </Grid>
                                <Grid xs={6}>
                                    <Typography level="body-xs">Date</Typography>
                                    <Typography level="body-md" sx={{ fontFamily: 'monospace' }}>
                                        {(regionalSettings.date_format || 'dd/MM/yyyy').replace('dd', '16').replace('MM', '01').replace('yyyy', '2026')}
                                    </Typography>
                                </Grid>
                            </Grid>
                        </Sheet>
                        
                        {isAdmin && (
                            <Button 
                                variant="solid" 
                                color="primary" 
                                startDecorator={<Public />}
                                onClick={handleSaveRegional}
                                sx={{ alignSelf: 'flex-start' }}
                            >
                                Save Settings
                            </Button>
                        )}
                    </Stack>
                </Box>
            )}

            {activeTab === 3 && (
                <Box>
                    <Box sx={{ mb: 4 }}>
                        <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>Feature Modules</Typography>
                        <Typography level="body-md" color="neutral">Enable or disable specific sections of the application to suit your household's needs.</Typography>
                    </Box>

                    <Stack spacing={2}>
                        {['pets', 'vehicles', 'meals'].map(mod => (
                            <Sheet key={mod} variant="outlined" sx={{ p: 2, borderRadius: 'md', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography level="title-md" textTransform="capitalize" startDecorator={<ViewModule />}>{mod}</Typography>
                                    <Typography level="body-xs" color="neutral">
                                        {mod === 'pets' && "Track pets under the People section."}
                                        {mod === 'vehicles' && "Manage cars, maintenance, and MOTs."}
                                        {mod === 'meals' && "Plan weekly meals and menus."}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    {enabledModules.includes(mod) ? 
                                        <Chip color="success" variant="soft" startDecorator={<CheckCircle />}>Enabled</Chip> : 
                                        <Chip color="neutral" variant="soft" startDecorator={<Cancel />}>Disabled</Chip>
                                    }
                                    <Switch 
                                        checked={enabledModules.includes(mod)}
                                        onChange={() => toggleModule(mod)}
                                        disabled={!isAdmin}
                                    />
                                </Box>
                            </Sheet>
                        ))}
                    </Stack>
                </Box>
            )}

            {activeTab === 4 && (
                <Box>
                    <Box sx={{ mb: 4 }}>
                        <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>Developer Tools</Typography>
                        <Typography level="body-md" color="neutral">Integration and technical documentation for the TOTEM platform.</Typography>
                    </Box>
                    
                    <Sheet variant="outlined" sx={{ p: 3, borderRadius: 'md', maxWidth: 600 }}>
                        <Stack spacing={2}>
                            <Typography level="title-md" startDecorator={<Code />}>API Documentation</Typography>
                            <Typography level="body-sm">Access the full Swagger/OpenAPI specifications to build custom integrations or tools.</Typography>
                            <Button 
                                component="a" 
                                href="/api-docs/" 
                                target="_blank" 
                                variant="soft" 
                                endDecorator={<OpenInNew />}
                                sx={{ alignSelf: 'flex-start' }}
                            >
                                Open API Reference
                            </Button>
                        </Stack>
                    </Sheet>
                </Box>
            )}

            {activeTab === 5 && (
                <Box sx={{ maxWidth: 800 }}>
                    <Box sx={{ mb: 4 }}>
                        <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>About TOTEM</Typography>
                        <Typography level="body-md" color="neutral">Platform credits, licensing and open source information.</Typography>
                    </Box>

                    <Grid container spacing={3}>
                        <Grid xs={12} md={6}>
                            <Stack spacing={2}>
                                <Typography level="title-md" startDecorator={<Verified color="primary" />}>The Platform</Typography>
                                <Typography level="body-sm">
                                    TOTEM is a multi-tenant household management system designed for families who demand absolute data privacy and consistent utility tracking.
                                </Typography>
                                <Divider />
                                <Typography level="title-md" startDecorator={<Update color="success" />}>System Status</Typography>
                                <Sheet variant="soft" color="neutral" sx={{ p: 2, borderRadius: 'sm' }}>
                                    <Grid container spacing={2}>
                                        <Grid xs={4}><Typography level="body-xs" fontWeight="bold">Version</Typography></Grid>
                                        <Grid xs={8}><Typography level="body-xs" sx={{ fontFamily: 'monospace' }}>v{pkg.version}</Typography></Grid>
                                        
                                        <Grid xs={4}><Typography level="body-xs" fontWeight="bold">Build</Typography></Grid>
                                        <Grid xs={8}><Typography level="body-xs" sx={{ fontFamily: 'monospace' }}>{gitInfo.commitMessage || 'Development Build'}</Typography></Grid>

                                        {gitInfo.date && (
                                            <>
                                                <Grid xs={4}><Typography level="body-xs" fontWeight="bold">Date</Typography></Grid>
                                                <Grid xs={8}><Typography level="body-xs" sx={{ fontFamily: 'monospace' }}>{gitInfo.date}</Typography></Grid>
                                            </>
                                        )}
                                    </Grid>
                                </Sheet>
                                <Divider />
                                <Typography level="title-md" startDecorator={<Info />}>Credits</Typography>
                                <Typography level="body-sm">
                                    Built with MUI Joy UI, React, and Node.js. 
                                    Icons provided by Google Material Icons.
                                    Database powered by SQLite.
                                </Typography>
                            </Stack>
                        </Grid>
                        <Grid xs={12} md={6}>
                            <Stack spacing={2}>
                                <Typography level="title-md" startDecorator={<Policy />}>Licensing</Typography>
                                <Typography level="body-sm">
                                    Licensed under the <b>MIT Open Source License</b>. 
                                    You are free to use, modify, and distribute this software for personal or commercial use.
                                </Typography>
                                <Divider />
                                <Typography level="title-md">Open Source</Typography>
                                <Typography level="body-sm">
                                    This project values community contributions. All shared UI components and API patterns follow the Prime Directives of Tenancy and Atomic consistency.
                                </Typography>
                            </Stack>
                        </Grid>
                    </Grid>
                </Box>
            )}
          </Box>
        </Tabs>
      </Sheet>

      {/* Edit User Modal */}
      <Modal open={!!editUser} onClose={() => setEditUser(null)}>
          <ModalDialog>
              <DialogTitle>{isInvite ? 'Invite New Member' : `Edit ${editUser?.first_name || 'User'}`}</DialogTitle>
              <form onSubmit={handleSaveUser}>
                  <Stack spacing={2} mt={1}>
                      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                        <Tooltip title="Choose Avatar" variant="soft">
                            <Avatar 
                                size="lg" 
                                sx={{ 
                                    '--Avatar-size': '80px', 
                                    fontSize: '2rem', 
                                    bgcolor: getEmojiColor(formData.avatar, false),
                                    cursor: 'pointer',
                                    '&:hover': { transform: 'scale(1.05)' },
                                    transition: 'transform 0.2s'
                                }}
                                onClick={() => setEmojiPickerOpen(true)}
                            >
                                {formData.avatar}
                            </Avatar>
                        </Tooltip>
                      </Box>

                      <FormControl required>
                          <FormLabel>Email Address</FormLabel>
                          <Input 
                            name="email" 
                            type="email" 
                            value={formData.email} 
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            disabled={!isInvite} 
                          />
                      </FormControl>
                      
                      <FormControl>
                          <FormLabel>First Name</FormLabel>
                          <Input 
                            name="first_name" 
                            value={formData.first_name} 
                            onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                          />
                      </FormControl>
                      <FormControl>
                          <FormLabel>Last Name</FormLabel>
                          <Input 
                            name="last_name" 
                            value={formData.last_name} 
                            onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                          />
                      </FormControl>
                      
                      <FormControl required>
                          <FormLabel>Role</FormLabel>
                          <Select 
                            name="role" 
                            value={formData.role}
                            onChange={(_e, v) => setFormData({...formData, role: v})}
                          >
                              <Option value="admin">Administrator</Option>
                              <Option value="member">Standard Member</Option>
                              <Option value="viewer">Viewer (Read-only)</Option>
                          </Select>
                      </FormControl>
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', pt: 2 }}>
                          <Button variant="plain" color="neutral" onClick={() => setEditUser(null)}>Cancel</Button>
                          <Button type="submit" variant="solid" loading={savingUser}>{isInvite ? 'Send Invitation' : 'Update User'}</Button>
                      </Box>
                  </Stack>
              </form>
          </ModalDialog>
      </Modal>

      <EmojiPicker 
        open={emojiPickerOpen} 
        onClose={() => setEmojiPickerOpen(false)} 
        onEmojiSelect={(emoji) => {
          setFormData({...formData, avatar: emoji});
          setEmojiPickerOpen(false);
        }}
        title="Choose Avatar Emoji"
      />

      {/* Invite Success Modal */}
      <Modal open={!!inviteSuccess} onClose={() => setInviteSuccess(null)}>
        <ModalDialog variant="outlined" role="alertdialog">
          <DialogTitle color="success">Invitation Sent</DialogTitle>
          <DialogContent>
            <Stack spacing={2}>
              <Typography>
                User <b>{inviteSuccess?.email}</b> has been added to the household.
              </Typography>
              <Sheet variant="soft" color="warning" sx={{ p: 2, borderRadius: 'sm' }}>
                <Typography level="body-sm" fontWeight="bold">Temporary Password:</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                  <Typography level="h3" sx={{ fontFamily: 'monospace' }}>{inviteSuccess?.password}</Typography>
                  <IconButton 
                    size="sm" 
                    onClick={() => {
                        navigator.clipboard.writeText(inviteSuccess?.password);
                        showNotification("Password copied to clipboard", "success");
                    }}
                  >
                    <ContentCopy />
                  </IconButton>
                </Box>
                <Typography level="body-xs" sx={{ mt: 1 }}>
                  Please share this password securely with the user. They can change it after logging in.
                </Typography>
              </Sheet>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button variant="solid" color="primary" onClick={() => setInviteSuccess(null)}>Done</Button>
          </DialogActions>
        </ModalDialog>
      </Modal>

      {/* Create New Household Modal */}
      <Modal open={isCreateHhModalOpen} onClose={() => setIsCreateHhModalOpen(false)}>
        <ModalDialog>
          <DialogTitle>Create New Household</DialogTitle>
          <DialogContent>Register a new property tenant. You will be assigned as the Administrator.</DialogContent>
          <form onSubmit={handleCreateNewHousehold}>
            <Stack spacing={2}>
              <FormControl required>
                <FormLabel>Household Name</FormLabel>
                <Input 
                  placeholder="e.g. Summer House" 
                  value={newHhName}
                  onChange={(e) => setNewHhName(e.target.value)}
                  autoFocus
                />
              </FormControl>
              <DialogActions>
                <Button type="submit" loading={isCreatingHh}>Create Household</Button>
                <Button variant="plain" color="neutral" onClick={() => setIsCreateHhModalOpen(false)}>Cancel</Button>
              </DialogActions>
            </Stack>
          </form>
        </ModalDialog>
      </Modal>
    </Box>
  );
}