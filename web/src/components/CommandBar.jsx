import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  KBarProvider,
  KBarPortal,
  KBarPositioner,
  KBarAnimator,
  KBarSearch,
  useMatches,
  KBarResults,
  useKBar,
} from 'kbar';
import { Box, Typography, Sheet, Stack, GlobalStyles } from '@mui/joy';
import {
  Home,
  AccountBalance,
  RestaurantMenu,
  ShoppingBag,
  People,
  DirectionsCar,
  Settings,
  Security,
} from '@mui/icons-material';
import { TextHighlighter } from '../utils/text';

const RenderResults = () => {
  const { results } = useMatches();
  const { search } = useKBar((state) => ({ search: state.searchQuery }));

  return (
    <KBarResults
      items={results}
      onRender={({ item, active }) =>
        typeof item === 'string' ? (
          <Typography
            level="body-xs"
            sx={{ px: 2, py: 1, opacity: 0.5, textTransform: 'uppercase' }}
          >
            {item}
          </Typography>
        ) : (
          <Box
            sx={{
              px: 2,
              py: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              bgcolor: active ? 'background.level1' : 'transparent',
              borderLeft: '4px solid',
              borderColor: active ? 'primary.solidBg' : 'transparent',
            }}
          >
            <Stack direction="row" spacing={2} alignItems="center">
              {item.icon}
              <Stack spacing={0}>
                <Typography level="title-sm">
                  <TextHighlighter text={item.name} query={search} />
                </Typography>
                {item.subtitle && (
                  <Typography level="body-xs">
                    <TextHighlighter text={item.subtitle} query={search} />
                  </Typography>
                )}
              </Stack>
            </Stack>
            {item.shortcut?.length > 0 && (
              <Stack direction="row" spacing={0.5}>
                {item.shortcut.map((sc) => (
                  <Sheet
                    key={sc}
                    variant="soft"
                    sx={{ px: 0.5, borderRadius: 'xs', fontSize: 'xs' }}
                  >
                    {sc}
                  </Sheet>
                ))}
              </Stack>
            )}
          </Box>
        )
      }
    />
  );
};

export default function CommandBar({ children, householdId }) {
  const navigate = useNavigate();

  const actions = [
    {
      id: 'home',
      name: 'Dashboard',
      shortcut: ['h'],
      keywords: 'home dashboard index',
      perform: () => navigate(`/household/${householdId}/dashboard`),
      icon: <Home />,
      section: 'Navigation',
    },
    {
      id: 'finance',
      name: 'Finance',
      shortcut: ['f'],
      keywords: 'money budget spending income',
      perform: () => navigate(`/household/${householdId}/finance`),
      icon: <AccountBalance />,
      section: 'Navigation',
    },
    {
      id: 'meals',
      name: 'Meals',
      shortcut: ['m'],
      keywords: 'food dinner lunch breakfast planner',
      perform: () => navigate(`/household/${householdId}/meals`),
      icon: <RestaurantMenu />,
      section: 'Navigation',
    },
    {
      id: 'shopping',
      name: 'Shopping List',
      shortcut: ['s'],
      keywords: 'groceries food buy',
      perform: () => navigate(`/household/${householdId}/shopping`),
      icon: <ShoppingBag />,
      section: 'Navigation',
    },
    {
      id: 'people',
      name: 'People',
      shortcut: ['p'],
      keywords: 'members family friends',
      perform: () => navigate(`/household/${householdId}/people`),
      icon: <People />,
      section: 'Navigation',
    },
    {
      id: 'vehicles',
      name: 'Vehicles',
      shortcut: ['v'],
      keywords: 'cars bikes transport',
      perform: () => navigate(`/household/${householdId}/vehicles`),
      icon: <DirectionsCar />,
      section: 'Navigation',
    },
    {
      id: 'settings',
      name: 'Settings',
      shortcut: [','],
      keywords: 'config preferences options',
      perform: () => navigate(`/household/${householdId}/settings`),
      icon: <Settings />,
      section: 'Navigation',
    },
    {
      id: 'security',
      name: 'Security Log',
      shortcut: ['a'],
      keywords: 'audit security logs sensitive',
      perform: () => navigate(`/household/${householdId}/house/security`),
      icon: <Security />,
      section: 'Navigation',
    },
  ];

  return (
    <KBarProvider actions={actions}>
      <GlobalStyles
        styles={{
          '.kbar-search': {
            padding: '12px 16px',
            fontSize: '16px',
            width: '100%',
            boxSizing: 'border-box',
            outline: 'none',
            border: 'none',
            background: 'var(--joy-palette-background-surface)',
            color: 'var(--joy-palette-text-primary)',
            fontFamily: 'inherit',
          },
        }}
      />
      <KBarPortal>
        <KBarPositioner
          sx={{ zIndex: 10000, bgcolor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
        >
          <KBarAnimator
            style={{
              maxWidth: '600px',
              width: '100%',
              background: 'var(--joy-palette-background-surface)',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            }}
          >
            <KBarSearch className="kbar-search" placeholder="Type a command or search..." />
            <RenderResults />
          </KBarAnimator>
        </KBarPositioner>
      </KBarPortal>
      {children}
    </KBarProvider>
  );
}
