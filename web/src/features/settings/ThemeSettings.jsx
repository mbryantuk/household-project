import { useState, useMemo, useEffect } from 'react';
import { Box, Typography, Sheet, Stack, Grid, Tooltip, FormControl, FormLabel, Switch, Input, Button, Divider } from '@mui/joy';
import Palette from '@mui/icons-material/Palette';
import LightMode from '@mui/icons-material/LightMode';
import DarkMode from '@mui/icons-material/DarkMode';

import { useHousehold } from '../../contexts/HouseholdContext';
import { THEMES } from '../../theme';

const ThemeGrid = ({ themes, themeId, onThemeChange, isDark }) => (
  <Grid container spacing={2}>
      {themes.map((spec) => (
          <Grid key={spec.id} xs={6} sm={4} md={2.4}>
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
                      display: 'flex', width: '100%', height: 24, borderRadius: 'xs', 
                      overflow: 'hidden', mb: 1, border: '1px solid rgba(0,0,0,0.1)',
                      bgcolor: spec.primary
                  }} />
                  <Typography level="title-sm" noWrap sx={{ 
                      fontSize: '12px', 
                      color: themeId === spec.id ? 'common.white' : 'text.primary', 
                      width: '100%',
                      fontWeight: 600
                  }}>{spec.name}</Typography>
                  
                  {themeId === spec.id && (
                      <Palette sx={{ position: 'absolute', top: 4, right: 4, fontSize: '0.6rem', color: 'common.white' }} />
                  )}
              </Sheet>
          </Grid>
      ))}
  </Grid>
);

export default function ThemeSettings() {
  const { user, themeId, onThemeChange, onPreviewTheme, onUpdateProfile, showNotification, isDark } = useHousehold();

  // Custom Theme State
  const [customThemeConfig, setCustomThemeConfig] = useState(() => {
    const DEFAULT_MANTEL = { primary: '#374151' };
    if (user?.custom_theme) {
      try {
        return typeof user.custom_theme === 'string' 
          ? JSON.parse(user.custom_theme) 
          : user.custom_theme;
      } catch { return DEFAULT_MANTEL; }
    }
    return DEFAULT_MANTEL;
  });

  // Effect to update preview when custom config changes
  useEffect(() => {
    if (themeId === 'custom') {
      onPreviewTheme('custom', customThemeConfig);
    }
  }, [customThemeConfig, themeId, onPreviewTheme]);

  const handleSaveCustomTheme = async () => {
    try {
      await onUpdateProfile({ custom_theme: JSON.stringify(customThemeConfig), theme: 'custom' });
      showNotification("Custom theme saved.", "success");
    } catch {
      showNotification("Failed to save.", "danger");
    }
  };

  const handleThemeSelect = (id) => {
    if (id === 'custom') {
      onThemeChange('custom');
      onPreviewTheme('custom', customThemeConfig);
    } else {
      onThemeChange(id);
      onPreviewTheme(null); // Clear preview when official theme selected
    }
  };

  const allThemes = useMemo(() => {
    return Object.entries(THEMES)
        .filter(([id]) => id !== 'custom')
        .map(([id, spec]) => ({ id, ...spec }));
  }, []);

  return (
    <Stack spacing={4}>
      <Box>
        <Typography level="h4">System Appearance</Typography>
        <Typography level="body-sm">Select a color identity. All Signature themes now support dual Light & Dark modes based on your system preference.</Typography>
      </Box>

      {/* Signature Section */}
      <Box>
        <Typography level="title-lg" startDecorator={<Palette color="primary" />} sx={{ mb: 3 }}>Signature Collection</Typography>
        <ThemeGrid themes={allThemes} themeId={themeId} onThemeChange={handleThemeSelect} isDark={isDark} />
      </Box>

      <Divider />

      <Box>
          <Typography level="title-lg" startDecorator={<Palette color="neutral" />} sx={{ mb: 2 }}>Laboratory</Typography>
          <Grid container spacing={2}>
              <Grid xs={6} sm={4} md={3}>
                  <Sheet
                      variant={themeId === 'custom' ? 'solid' : 'outlined'}
                      color={themeId === 'custom' ? 'primary' : 'neutral'}
                      onClick={() => handleThemeSelect('custom')}
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
                          bgcolor: customThemeConfig.primary
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
    </Stack>
  );
}
