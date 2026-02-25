import React from 'react';
import { CssVarsProvider, CssBaseline } from '@mui/joy';
import { getAppTheme } from '../src/theme';

export const decorators = [
  (Story) => (
    <CssVarsProvider theme={getAppTheme()}>
      <CssBaseline />
      <Story />
    </CssVarsProvider>
  ),
];

export const parameters = {
  actions: { argTypesRegex: '^on[A-Z].*' },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/i,
    },
  },
};
