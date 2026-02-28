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
  useRegisterActions,
} from 'kbar';
import { Box, Typography, Sheet, Stack, GlobalStyles, IconButton } from '@mui/joy';
import {
  Home,
  AccountBalance,
  RestaurantMenu,
  ShoppingBag,
  People,
  DirectionsCar,
  Settings,
  Security,
  LocalOffer,
  FormatListBulleted,
  Mic,
} from '@mui/icons-material';
import { TextHighlighter } from '../utils/text';

const VoiceControl = ({ setQuery }) => {
  const [isListening, setIsListening] = React.useState(false);
  const recognition = React.useRef(null);

  React.useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = false;
      recognition.current.interimResults = false;
      recognition.current.lang = 'en-GB';

      recognition.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setQuery(transcript);
        setIsListening(false);
      };

      recognition.current.onerror = () => setIsListening(false);
      recognition.current.onend = () => setIsListening(false);
    }
  }, [setQuery]);

  const toggleListening = () => {
    if (isListening) {
      recognition.current?.stop();
    } else {
      recognition.current?.start();
      setIsListening(true);
    }
  };

  const hasSupport = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  if (!hasSupport) return null;

  return (
    <IconButton
      variant={isListening ? 'solid' : 'plain'}
      color={isListening ? 'danger' : 'neutral'}
      onClick={toggleListening}
      sx={{ mr: 1, borderRadius: '50%' }}
    >
      <Mic />
    </IconButton>
  );
};

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

const DynamicActionManager = ({ api, householdId }) => {
  const { search } = useKBar((state) => ({ search: state.searchQuery }));
  const [dynamicActions, setDynamicActions] = React.useState([]);

  React.useEffect(() => {
    if (!search || !api || !householdId) {
      setDynamicActions([]);
      return;
    }

    const newActions = [];

    // 1. Transaction: "Add £50 to groceries"
    const txMatch = search.match(/^add (?:£|)?(\d+(?:\.\d{2})?) to (.+)$/i);
    if (txMatch) {
      newActions.push({
        id: 'smart-tx',
        name: `Log £${txMatch[1]} for ${txMatch[2]}`,
        section: 'Smart Actions',
        perform: async () => {
          await api.post(`/households/${householdId}/transactions`, {
            description: `Command: ${txMatch[2]}`,
            amount: -parseFloat(txMatch[1]),
            category: txMatch[2],
            date: new Date().toISOString().split('T')[0],
          });
          window.location.reload(); // Quick refresh to show new data
        },
        icon: <AccountBalance />,
      });
    }

    // 2. Shopping: "Add Milk to shopping list" or just "Add Milk"
    const shopMatch = search.match(/^add (.+) to shopping(?: list)?$/i);
    const simpleShopMatch = search.match(/^buy (.+)$/i);
    const itemToAdd = shopMatch?.[1] || simpleShopMatch?.[1];

    if (itemToAdd) {
      newActions.push({
        id: 'smart-shopping',
        name: `Add ${itemToAdd} to Shopping List`,
        section: 'Smart Actions',
        perform: async () => {
          await api.post(`/households/${householdId}/shopping-list`, {
            name: itemToAdd,
            category: 'general',
          });
        },
        icon: <ShoppingBag />,
      });
    }

    // 3. Mileage: "Log 1000 miles for Tesla"
    const mileageMatch = search.match(/^log (\d+) miles for (.+)$/i);
    if (mileageMatch) {
      newActions.push({
        id: 'smart-mileage',
        name: `Log ${mileageMatch[1]} miles for ${mileageMatch[2]}`,
        section: 'Smart Actions',
        perform: async () => {
          // This would ideally search for vehicle by name, but for now we'll just redirect to vehicles
          window.location.href = `/household/${householdId}/vehicles?search=${mileageMatch[2]}&mileage=${mileageMatch[1]}`;
        },
        icon: <DirectionsCar />,
      });
    }

    setDynamicActions(newActions);
  }, [search, api, householdId]);

  useRegisterActions(dynamicActions, [dynamicActions]);
  return null;
};

export default function CommandBar({ children, householdId, api }) {
  const navigate = useNavigate();
  const { query } = useKBar();

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
      <DynamicActionManager api={api} householdId={householdId} />
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
            <Stack direction="row" alignItems="center" sx={{ px: 1 }}>
              <KBarSearch className="kbar-search" placeholder="Type a command or search..." />
              <VoiceControl setQuery={query.setSearch} />
            </Stack>
            <RenderResults />
          </KBarAnimator>
        </KBarPositioner>
      </KBarPortal>
      {children}
    </KBarProvider>
  );
}
