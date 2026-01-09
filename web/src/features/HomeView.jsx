import { Responsive as ResponsiveGridLayout } from 'react-grid-layout';
import { useState, useEffect, useMemo, useRef } from 'react';
import { Box, Typography, Avatar, IconButton, Button, Menu, MenuItem, Pagination, Tooltip } from '@mui/material';
import { Edit, Save, Add, Delete, Close } from '@mui/icons-material';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import BirthdaysWidget from '../components/widgets/BirthdaysWidget';
import EventsWidget from '../components/widgets/EventsWidget';

const WIDGET_TYPES = {
  birthdays: { component: BirthdaysWidget, label: 'Upcoming Birthdays', defaultH: 4, defaultW: 6 },
  events: { component: EventsWidget, label: 'Upcoming Events', defaultH: 4, defaultW: 6 },
};

// Default layout for new users
const DEFAULT_LAYOUT = [
  { i: 'birthdays-1', x: 0, y: 0, w: 6, h: 4, type: 'birthdays' },
  { i: 'events-1', x: 6, y: 0, w: 6, h: 4, type: 'events' },
];

export default function HomeView({ members, household, currentUser, dates }) {
  // State
  const [isEditing, setIsEditing] = useState(false);
  const [page, setPage] = useState(1);
  const [layouts, setLayouts] = useState(() => {
    const saved = localStorage.getItem(`dashboard_${household?.id}_${currentUser?.username}`);
    return saved ? JSON.parse(saved) : { 1: DEFAULT_LAYOUT };
  });
  const [addWidgetAnchor, setAddWidgetAnchor] = useState(null);
  const [width, setWidth] = useState(1200);
  const containerRef = useRef(null);

  // Resize Observer
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
        for (let entry of entries) {
            setWidth(entry.contentRect.width);
        }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Current Page Items
  const currentItems = useMemo(() => layouts[page] || [], [layouts, page]);

  // Derived Grid Items with explicit static property
  const gridItems = useMemo(() => {
    return currentItems.map(item => ({
      ...item,
      static: !isEditing
    }));
  }, [currentItems, isEditing]);

  // Save on change
  useEffect(() => {
    localStorage.setItem(`dashboard_${household?.id}_${currentUser?.username}`, JSON.stringify(layouts));
  }, [layouts, household?.id, currentUser?.username]);

  // Handlers
  const handleLayoutChange = (layout) => {
    const newItems = layout.map(l => {
        const existing = currentItems.find(i => i.i === l.i);
        // We do NOT want to save the 'static' property to state/localstorage, 
        // as it is derived from isEditing.
        const { static: _static, ...cleanLayout } = l;
        return { ...existing, ...cleanLayout };
    });
    
    setLayouts(prev => ({
        ...prev,
        [page]: newItems
    }));
  };

  const handleAddWidget = (type) => {
    const config = WIDGET_TYPES[type];
    const newId = `${type}-${Date.now()}`;
    const newItem = {
        i: newId,
        x: (currentItems.length * 6) % 12,
        y: Infinity,
        w: config.defaultW,
        h: config.defaultH,
        type: type
    };
    
    setLayouts(prev => ({
        ...prev,
        [page]: [...(prev[page] || []), newItem]
    }));
    setAddWidgetAnchor(null);
  };

  const handleRemoveWidget = (id) => {
      setLayouts(prev => ({
          ...prev,
          [page]: prev[page].filter(i => i.i !== id)
      }));
  };

  const hour = new Date().getHours();
  let greeting = "Good evening";
  if (hour < 12) greeting = "Good morning";
  else if (hour < 17) greeting = "Good afternoon";

  return (
    <Box sx={{ pb: 10 }}>
      
      {/* HEADER */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: '300', mb: 0.5 }}>
            {greeting}, <Box component="span" sx={{ fontWeight: '700', color: 'primary.main' }}>{currentUser?.username || 'User'}</Box>
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
            {isEditing ? (
                <>
                    <Button 
                        variant="outlined" 
                        startIcon={<Add />} 
                        onClick={(e) => setAddWidgetAnchor(e.currentTarget)}
                    >
                        Add Widget
                    </Button>
                    <Button 
                        variant="contained" 
                        color="primary" 
                        startIcon={<Save />} 
                        onClick={() => setIsEditing(false)}
                    >
                        Done
                    </Button>
                </>
            ) : (
                <Button 
                    variant="text" 
                    startIcon={<Edit />} 
                    onClick={() => setIsEditing(true)}
                >
                    Edit Dashboard
                </Button>
            )}
        </Box>
      </Box>

      {/* GRID */}
      <div ref={containerRef}>
        <ResponsiveGridLayout
            className="layout"
            layouts={{ lg: gridItems, md: gridItems, sm: gridItems }}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
            rowHeight={60}
            width={width}
            isDraggable={isEditing}
            isResizable={isEditing}
            onLayoutChange={(layout) => handleLayoutChange(layout)}
            margin={[16, 16]}
        >
            {gridItems.map(item => {
                const WidgetComponent = WIDGET_TYPES[item.type]?.component;
                return (
                    <Box key={item.i} data-grid={{ ...item, static: !isEditing }} sx={{ position: 'relative' }}>
                        {isEditing && (
                            <Box sx={{ position: 'absolute', top: -10, right: -10, zIndex: 10 }}>
                                <IconButton 
                                    size="small" 
                                    sx={{ bgcolor: 'error.main', color: 'white', '&:hover': { bgcolor: 'error.dark' } }}
                                    onClick={() => handleRemoveWidget(item.i)}
                                >
                                    <Close fontSize="small" />
                                </IconButton>
                            </Box>
                        )}
                        
                        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                                {WidgetComponent ? (
                                    <WidgetComponent dates={dates} members={members} />
                                ) : (
                                    <Typography color="error">Unknown Widget</Typography>
                                )}
                            </Box>
                        </Box>
                    </Box>
                );
            })}
        </ResponsiveGridLayout>
      </div>

      {/* PAGINATION / EMPTY STATE */}
      {currentItems.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary', border: '2px dashed', borderColor: 'divider', borderRadius: 4, mt: 2 }}>
              <Typography>This page is empty.</Typography>
              {isEditing && <Button startIcon={<Add />} onClick={(e) => setAddWidgetAnchor(e.currentTarget)}>Add a widget</Button>}
          </Box>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination count={3} page={page} onChange={(e, v) => setPage(v)} color="primary" />
      </Box>

      {/* ADD MENU */}
      <Menu
        anchorEl={addWidgetAnchor}
        open={Boolean(addWidgetAnchor)}
        onClose={() => setAddWidgetAnchor(null)}
      >
        {Object.entries(WIDGET_TYPES).map(([key, config]) => (
            <MenuItem key={key} onClick={() => handleAddWidget(key)}>
                {config.label}
            </MenuItem>
        ))}
      </Menu>

    </Box>
  );
}
