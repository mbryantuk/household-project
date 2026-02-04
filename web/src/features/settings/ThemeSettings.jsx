import { useState, useMemo } from 'react';
import { Box, Typography, Sheet, Stack, Grid, Tooltip, FormControl, FormLabel, Switch, Input, Button, Divider } from '@mui/joy';
import Palette from '@mui/icons-material/Palette';
import LightMode from '@mui/icons-material/LightMode';
import DarkMode from '@mui/icons-material/DarkMode';

import { useHousehold } from '../../contexts/HouseholdContext';
import { THEMES } from '../../theme';

export default function ThemeSettings() {
  const { user, themeId, onThemeChange, onUpdateProfile, showNotification } = useHousehold();

  // Custom Theme State
  const [customThemeConfig, setCustomThemeConfig] = useState(() => {
    if (user?.custom_theme) {
      try {
        return typeof user.custom_theme === 'string' 
          ? JSON.parse(user.custom_theme) 
          : user.custom_theme;
      } catch { return { mode: 'light', primary: '#644AC9', bg: '#FFFBEB', surface: '#FFF', selection: '#CFCFDE', text: '#1F1F1F' }; }
    }
    return { mode: 'light', primary: '#644AC9', bg: '#FFFBEB', surface: '#FFF', selection: '#CFCFDE', text: '#1F1F1F' };
  });

  const handleSaveCustomTheme = async () => {
    try {
      await onUpdateProfile({ custom_theme: JSON.stringify(customThemeConfig) });
      showNotification("Custom theme saved.", "success");
    } catch {
      showNotification("Failed to save custom theme.", "danger");
    }
  };

  const groupedThemes = useMemo(() => {
    const groups = { light: [], dark: [] };
    Object.entries(THEMES).forEach(([id, spec]) => {
      // Don't include custom in the grid if we want to show it separately, 
      // but the user says we "lost" it, so let's ensure it's in the Light group or separate.
      if (id === 'custom') return;
      groups[spec.mode].push({ id, ...spec });
    });
    return groups;
  }, []);

  const ThemeGrid = ({ themes }) => (
    <Grid container spacing={2}>
        {themes.map((spec) => (
            <Grid key={spec.id} xs={6} sm={4} md={3}>
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
                    <Typography level="title-sm" noWrap sx={{ fontSize: '13px', color: themeId === spec.id ? 'common.white' : 'text.primary', width: '100%' }}>{spec.name}</Typography>
                    {themeId === spec.id && (
                        <Palette sx={{ position: 'absolute', top: 6, right: 6, fontSize: '0.7rem', color: 'common.white' }} />
                    )}
                </Sheet>
            </Grid>
        ))}
    </Grid>
  );

  return (
    <Stack spacing={4}>
      <Box>
        <Typography level="h4">Appearance</Typography>
        <Typography level="body-sm">Personalize your platform experience</Typography>
      </Box>

      {/* Special Theme: Custom */}
      <Box>
          <Typography level="title-lg" startDecorator={<Palette color="primary" />} sx={{ mb: 2 }}>Laboratory</Typography>
          <Grid container spacing={2}>
              <Grid xs={6} sm={4} md={3}>
                  <Sheet
                      variant={themeId === 'custom' ? 'solid' : 'outlined'}
                      color={themeId === 'custom' ? 'primary' : 'neutral'}
                      onClick={() => onThemeChange('custom')}
                      sx={{
                          p: 1.5, borderRadius: 'md', cursor: 'pointer',
                          transition: 'all 0.2s',
                          '&:hover': { transform: 'translateY(-2px)', boxShadow: 'sm' },
                          position: 'relative',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center'
                      }}
                  >
                      <Box sx={{ 
                          display: 'flex', width: '100%', height: 32, borderRadius: 'sm', 
                          overflow: 'hidden', mb: 1, border: '1px solid rgba(0,0,0,0.1)',
                          background: `linear-gradient(135deg, ${customThemeConfig.primary} 0%, ${customThemeConfig.bg} 100%)`
                      }} />
                      <Typography level="title-sm" sx={{ fontSize: '13px', color: themeId === 'custom' ? 'common.white' : 'text.primary' }}>Custom Theme</Typography>
                  </Sheet>
              </Grid>
          </Grid>
      </Box>

      {themeId === 'custom' && (
          <Sheet variant="outlined" sx={{ p: 3, borderRadius: 'md', mb: 4, bgcolor: 'background.level1' }}>
              <Typography level="title-md" sx={{ mb: 2 }} startDecorator={<Palette color="primary" />}>Custom Theme Builder</Typography>
              <Grid container spacing={3}>
                  <Grid xs={12} sm={6} md={4}>
                      <FormControl>
                          <FormLabel>Mode</FormLabel>
                          <Stack direction="row" spacing={1} alignItems="center">
                              <Typography level="body-xs">Light</Typography>
                              <Switch 
                                  checked={customThemeConfig.mode === 'dark'} 
                                  onChange={(e) => setCustomThemeConfig({...customThemeConfig, mode: e.target.checked ? 'dark' : 'light'})}
                              />
                              <Typography level="body-xs">Dark</Typography>
                          </Stack>
                      </FormControl>
                  </Grid>
                  <Grid xs={12} sm={6} md={4}>
                      <FormControl>
                          <FormLabel>Primary Color</FormLabel>
                          <Stack direction="row" spacing={1}>
                              <input type="color" value={customThemeConfig.primary} onChange={(e) => setCustomThemeConfig({...customThemeConfig, primary: e.target.value})} style={{ width: 40, height: 40, border: 'none', borderRadius: 4, cursor: 'pointer' }} />
                              <Input size="sm" value={customThemeConfig.primary} onChange={(e) => setCustomThemeConfig({...customThemeConfig, primary: e.target.value})} />
                          </Stack>
                      </FormControl>
                  </Grid>
                  <Grid xs={12}>
                      <Button variant="solid" color="primary" onClick={handleSaveCustomTheme}>Save Custom Theme</Button>
                  </Grid>
              </Grid>
          </Sheet>
      )}

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
    </Stack>
  );
}
