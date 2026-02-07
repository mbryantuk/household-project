import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Typography, Tabs, TabList, Tab, TabPanel, Sheet, Divider } from '@mui/joy';
import Person from '@mui/icons-material/Person';
import Home from '@mui/icons-material/Home';
import Palette from '@mui/icons-material/Palette';
import Security from '@mui/icons-material/Security';
import SettingsIcon from '@mui/icons-material/Settings';

import { useHousehold } from '../contexts/HouseholdContext';
import ProfileSettings from './settings/ProfileSettings';
import HouseholdSettings from './settings/HouseholdSettings';
import ThemeSettings from './settings/ThemeSettings';
import AdminSettings from './settings/AdminSettings';
import SecuritySettings from './settings/SecuritySettings';
import AppHeader from '../components/ui/AppHeader';

export default function SettingsView() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const tabParam = parseInt(queryParams.get('tab')) || 0;

  const [index, setIndex] = useState(tabParam);
  const { user } = useHousehold();
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (tabParam !== index) {
        setIndex(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (e, val) => {
    setIndex(val);
    navigate(`?tab=${val}`, { replace: true });
  };

  return (
    <Box sx={{ flex: 1, width: '100%', maxWidth: 1200, mx: 'auto', p: { xs: 1, md: 2 } }}>
      <AppHeader 
        title="Control Center"
        description="Manage your account, household, and application preferences."
      />

      <Tabs 
        orientation="vertical" 
        value={index} 
        onChange={handleTabChange}
        sx={{ bgcolor: 'transparent' }}
      >
        <Sheet 
            variant="outlined" 
            sx={{ 
            borderRadius: 'md', 
            display: 'flex', 
            flexDirection: { xs: 'column', md: 'row' },
            minHeight: 600,
            overflow: 'hidden',
            boxShadow: 'sm',
            width: '100%'
            }}
        >
            {/* Navigation Sidebar */}
            <Box sx={{ 
            width: { xs: '100%', md: 250 }, 
            bgcolor: 'background.level1',
            borderRight: { md: '1px solid' },
            borderColor: 'divider'
            }}>
                <TabList 
                    variant="plain" 
                    sx={{ 
                        p: 2, gap: 0.5, 
                        width: '100%',
                        '--ListItem-radius': '8px',
                        '& .MuiTab-root': {
                            justifyContent: 'flex-start',
                            py: 1.5
                        }
                    }}
                >
                <Typography level="title-xs" sx={{ mb: 1, px: 1, color: 'neutral.500', fontWeight: 'bold', letterSpacing: '1px' }}>ACCOUNT</Typography>
                <Tab variant="plain" color="neutral">
                    <Person sx={{ mr: 2 }} /> Profile
                </Tab>
                <Tab variant="plain" color="neutral">
                    <Security sx={{ mr: 2 }} /> Security
                </Tab>

                <Typography level="title-xs" sx={{ mt: 3, mb: 1, px: 1, color: 'neutral.500', fontWeight: 'bold', letterSpacing: '1px' }}>HOUSEHOLD</Typography>
                <Tab variant="plain" color="neutral">
                    <Home sx={{ mr: 2 }} /> General
                </Tab>
                <Tab variant="plain" color="neutral">
                    <Palette sx={{ mr: 2 }} /> Appearance
                </Tab>
                
                {isAdmin && (
                    <>
                        <Typography level="title-xs" sx={{ mt: 3, mb: 1, px: 1, color: 'neutral.500', fontWeight: 'bold', letterSpacing: '1px' }}>SYSTEM</Typography>
                        <Tab variant="plain" color="neutral">
                            <SettingsIcon sx={{ mr: 2 }} /> Admin Tools
                        </Tab>
                    </>
                )}
                </TabList>
            </Box>

            {/* Content Area */}
            <Box sx={{ flex: 1, p: { xs: 2, md: 4 }, bgcolor: 'background.surface', overflowY: 'auto' }}>
                <TabPanel value={0} sx={{ p: 0 }}>
                    <ProfileSettings />
                </TabPanel>
                <TabPanel value={1} sx={{ p: 0 }}>
                    <SecuritySettings />
                </TabPanel>
                <TabPanel value={2} sx={{ p: 0 }}>
                    <HouseholdSettings />
                </TabPanel>
                <TabPanel value={3} sx={{ p: 0 }}>
                    <ThemeSettings />
                </TabPanel>
                <TabPanel value={4} sx={{ p: 0 }}>
                    <AdminSettings />
                </TabPanel>
            </Box>
        </Sheet>
      </Tabs>
    </Box>
  );
}

      <Tabs 
        orientation="vertical" 
        value={index} 
        onChange={handleTabChange}
        sx={{ bgcolor: 'transparent' }}
      >
        <Sheet 
            variant="outlined" 
            sx={{ 
            borderRadius: 'md', 
            display: 'flex', 
            flexDirection: { xs: 'column', md: 'row' },
            minHeight: 600,
            overflow: 'hidden',
            boxShadow: 'sm',
            width: '100%'
            }}
        >
            {/* Navigation Sidebar */}
            <Box sx={{ 
            width: { xs: '100%', md: 250 }, 
            bgcolor: 'background.level1',
            borderRight: { md: '1px solid' },
            borderColor: 'divider'
            }}>
                <TabList 
                    variant="plain" 
                    sx={{ 
                        p: 2, gap: 0.5, 
                        width: '100%',
                        '--ListItem-radius': '8px',
                        '& .MuiTab-root': {
                            justifyContent: 'flex-start',
                            py: 1.5
                        }
                    }}
                >
                <Typography level="title-xs" sx={{ mb: 1, px: 1, color: 'neutral.500', fontWeight: 'bold', letterSpacing: '1px' }}>ACCOUNT</Typography>
                <Tab variant="plain" color="neutral">
                    <Person sx={{ mr: 2 }} /> Profile
                </Tab>
                <Tab variant="plain" color="neutral">
                    <Security sx={{ mr: 2 }} /> Security
                </Tab>

                <Typography level="title-xs" sx={{ mt: 3, mb: 1, px: 1, color: 'neutral.500', fontWeight: 'bold', letterSpacing: '1px' }}>HOUSEHOLD</Typography>
                <Tab variant="plain" color="neutral">
                    <Home sx={{ mr: 2 }} /> General
                </Tab>
                <Tab variant="plain" color="neutral">
                    <Palette sx={{ mr: 2 }} /> Appearance
                </Tab>
                
                {isAdmin && (
                    <>
                        <Typography level="title-xs" sx={{ mt: 3, mb: 1, px: 1, color: 'neutral.500', fontWeight: 'bold', letterSpacing: '1px' }}>SYSTEM</Typography>
                        <Tab variant="plain" color="neutral">
                            <SettingsIcon sx={{ mr: 2 }} /> Admin Tools
                        </Tab>
                    </>
                )}
                </TabList>
            </Box>

            {/* Content Area */}
            <Box sx={{ flex: 1, p: { xs: 2, md: 4 }, bgcolor: 'background.surface', overflowY: 'auto' }}>
                <TabPanel value={0} sx={{ p: 0 }}>
                    <ProfileSettings />
                </TabPanel>
                <TabPanel value={1} sx={{ p: 0 }}>
                    <SecuritySettings />
                </TabPanel>
                <TabPanel value={2} sx={{ p: 0 }}>
                    <HouseholdSettings />
                </TabPanel>
                <TabPanel value={3} sx={{ p: 0 }}>
                    <ThemeSettings />
                </TabPanel>
                <TabPanel value={4} sx={{ p: 0 }}>
                    <AdminSettings />
                </TabPanel>
            </Box>
        </Sheet>
      </Tabs>
    </Box>
  );
}