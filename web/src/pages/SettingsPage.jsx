import React, { useState, useEffect } from 'react';
import { FormControl, FormLabel, Select, Option } from '@mui/joy';
import { CssVarsProvider, useColorScheme } from '@mui/joy/styles';
import { Box, Typography } from '@mui/joy';

/**
 * Shared Select Component (AppSelect)
 * Enforces consistent styling and future-proofs for "Searchable" upgrades.
 * 
 * @param {string} label - Label for the FormControl
 * @param {string} name - Name attribute for the input
 * @param {any} value - Controlled value
 * @param {function} onChange - Change handler (value) => void
 * @param {Array<{value: string, label: string}>} options - Dropdown options
 * @param {string} placeholder - Placeholder text
 */
function AppSelect({ label, name, value, onChange, options = [], placeholder, ...props }) {
  return (
    <FormControl>
      {label && <FormLabel>{label}</FormLabel>}
      <Select 
        name={name} 
        value={value} 
        onChange={(e, newValue) => onChange && onChange(newValue)}
        placeholder={placeholder}
        {...props}
      >
        {options.map((opt) => (
          <Option key={opt.value} value={opt.value}>
            {opt.label}
          </Option>
        ))}
      </Select>
    </FormControl>
  );
}

const themeOptions = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

function SettingsPage() {
  const { mode, setMode } = useColorScheme();
  const [selectedTheme, setSelectedTheme] = useState(mode || 'system');

  useEffect(() => {
    setSelectedTheme(mode);
  }, [mode]);

  const handleThemeChange = (event) => {
    const newTheme = event.target.value;
    setSelectedTheme(newTheme);
    setMode(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography level="h4" sx={{ mb: 2 }}>
        Theme Settings
      </Typography>
      <AppSelect
        label="Select Theme"
        value={selectedTheme}
        onChange={handleThemeChange}
        options={themeOptions}
      />
    </Box>
  );
}

export default SettingsPage;