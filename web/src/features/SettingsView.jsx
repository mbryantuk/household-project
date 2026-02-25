import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  Sheet,
  Divider,
  Button,
  ListItemButton,
  ListItemDecorator,
} from '@mui/joy';
import Person from '@mui/icons-material/Person';
import Home from '@mui/icons-material/Home';
import Palette from '@mui/icons-material/Palette';
import Security from '@mui/icons-material/Security';
import SettingsIcon from '@mui/icons-material/Settings';
import Code from '@mui/icons-material/Code';
import OpenInNew from '@mui/icons-material/OpenInNew';

import { useHousehold } from '../context/HouseholdContext';
import ProfileSettings from './settings/ProfileSettings';
import ThemeSettings from './settings/ThemeSettings';
import AdminSettings from './settings/AdminSettings';
import SecuritySettings from './settings/SecuritySettings';

export default function SettingsView() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const tabParam = parseInt(queryParams.get('tab')) || 0;

  const { user, household } = useHousehold();
  const isAdmin = user?.role === 'admin';

  const handleTabChange = (e, val) => {
    navigate(`?tab=${val}`, { replace: true });
  };

  return (
    <Box
      data-testid="settings-view"
      sx={{ flex: 1, width: '100%', mx: 'auto', p: { xs: 1, md: 2 } }}
    >
      <Typography level="h2" sx={{ mb: 4, fontWeight: 'lg' }}>
        Control Center
      </Typography>

      <Tabs
        orientation="vertical"
        value={tabParam}
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
            width: '100%',
          }}
        >
          {/* Navigation Sidebar */}
          <Box
            sx={{
              width: { xs: '100%', md: 250 },
              bgcolor: 'background.level1',
              borderRight: { md: '1px solid' },
              borderColor: 'divider',
            }}
          >
            <TabList
              variant="plain"
              sx={{
                p: 2,
                gap: 0.5,
                width: '100%',
                '--ListItem-radius': '8px',
                '& .MuiTab-root': {
                  justifyContent: 'flex-start',
                  py: 1.5,
                },
              }}
            >
              <Typography
                level="title-xs"
                sx={{
                  mb: 1,
                  px: 1,
                  color: 'neutral.500',
                  fontWeight: 'bold',
                  letterSpacing: '1px',
                }}
              >
                ACCOUNT
              </Typography>
              <Tab variant="plain" color="neutral">
                <Person sx={{ mr: 2 }} /> Profile
              </Tab>
              <Tab variant="plain" color="neutral">
                <Security sx={{ mr: 2 }} /> Security
              </Tab>

              <Typography
                level="title-xs"
                sx={{
                  mt: 3,
                  mb: 1,
                  px: 1,
                  color: 'neutral.500',
                  fontWeight: 'bold',
                  letterSpacing: '1px',
                }}
              >
                HOUSEHOLD
              </Typography>

              <ListItemButton
                variant="plain"
                color="neutral"
                onClick={() => navigate(`/household/${household?.id}/house/details`)}
                sx={{
                  justifyContent: 'flex-start',
                  py: 1.5,
                  borderRadius: '8px',
                  fontWeight: 'md',
                  fontSize: 'sm',
                }}
              >
                <ListItemDecorator sx={{ color: 'text.secondary' }}>
                  <Home />
                </ListItemDecorator>
                General
              </ListItemButton>

              <ListItemButton
                variant="plain"
                color="neutral"
                onClick={() => navigate(`/household/${household?.id}/house/security`)}
                sx={{
                  justifyContent: 'flex-start',
                  py: 1.5,
                  borderRadius: '8px',
                  fontWeight: 'md',
                  fontSize: 'sm',
                }}
              >
                <ListItemDecorator sx={{ color: 'text.secondary' }}>
                  <Security />
                </ListItemDecorator>
                Security Log
              </ListItemButton>

              <Tab variant="plain" color="neutral">
                <Palette sx={{ mr: 2 }} /> Appearance
              </Tab>

              <Typography
                level="title-xs"
                sx={{
                  mt: 3,
                  mb: 1,
                  px: 1,
                  color: 'neutral.500',
                  fontWeight: 'bold',
                  letterSpacing: '1px',
                }}
              >
                DEVELOPER
              </Typography>
              <Tab variant="plain" color="neutral">
                <Code sx={{ mr: 2 }} /> API Access
              </Tab>

              {isAdmin && (
                <>
                  <Typography
                    level="title-xs"
                    sx={{
                      mt: 3,
                      mb: 1,
                      px: 1,
                      color: 'neutral.500',
                      fontWeight: 'bold',
                      letterSpacing: '1px',
                    }}
                  >
                    SYSTEM
                  </Typography>
                  <Tab variant="plain" color="neutral">
                    <SettingsIcon sx={{ mr: 2 }} /> Admin Tools
                  </Tab>
                </>
              )}
            </TabList>
          </Box>

          {/* Content Area */}
          <Box
            sx={{ flex: 1, p: { xs: 2, md: 4 }, bgcolor: 'background.surface', overflowY: 'auto' }}
          >
            <TabPanel value={0} sx={{ p: 0 }}>
              <ProfileSettings />
            </TabPanel>
            <TabPanel value={1} sx={{ p: 0 }}>
              <SecuritySettings />
            </TabPanel>
            {/* Index 2 skipped (Redirect) */}
            <TabPanel value={2} sx={{ p: 0 }}>
              <ThemeSettings />
            </TabPanel>
            <TabPanel value={3} sx={{ p: 0 }}>
              <Box>
                <Typography level="h4" sx={{ mb: 2 }}>
                  API Access & Documentation
                </Typography>
                <Typography level="body-md" sx={{ mb: 3 }}>
                  Explore the Hearth Household SaaS API documentation. Use this reference to
                  integrate with external tools or build custom extensions.
                </Typography>

                <Sheet
                  variant="outlined"
                  sx={{
                    p: 3,
                    borderRadius: 'md',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box>
                    <Typography level="title-md">Swagger UI</Typography>
                    <Typography level="body-sm" color="neutral">
                      Interactive API documentation (OpenAPI 3.0)
                    </Typography>
                  </Box>
                  <Button
                    component="a"
                    href="/api-docs"
                    target="_blank"
                    rel="noopener noreferrer"
                    endDecorator={<OpenInNew />}
                  >
                    Open Docs
                  </Button>
                </Sheet>
              </Box>
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
