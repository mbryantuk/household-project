import { Responsive as ResponsiveGridLayout } from 'react-grid-layout';
import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Box, Typography, IconButton, Button, Menu, MenuItem, 
  Pagination, Tooltip, Chip, Stack 
} from '@mui/material';
import { 
  Edit, Save, Add, Delete, Close, 
  AddCircleOutline, RemoveCircleOutline 
} from '@mui/icons-material';
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

export default function HomeView({ members, household, currentUser, dates, onUpdateProfile }) {
  // State
  const [isEditing, setIsEditing] = useState(false);
  const [page, setPage] = useState(1);
  const [layouts, setLayouts] = useState(() => {
    // 1. Try Cloud (Backend)
    if (currentUser?.dashboard_layout) {
      try {
        const cloud = typeof currentUser.dashboard_layout === 'string' 
          ? JSON.parse(currentUser.dashboard_layout) 
          : currentUser.dashboard_layout;
        if (cloud && Object.keys(cloud).length > 0) return cloud;
      } catch (e) { console.error("Cloud Layout Parse Error", e); }
    }
    
    // 2. Try Local Legacy
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

  // Handlers
  const handleLayoutChange = (layout) => {
    const newItems = layout.map(l => {
        const existing = currentItems.find(i => i.i === l.i);
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

  const handleSave = async () => {
    setIsEditing(false);
    if (onUpdateProfile) {
        try {
            await onUpdateProfile({ dashboard_layout: JSON.stringify(layouts) });
        } catch (err) {
            console.error("Failed to save layout to cloud:", err);
        }
    }
    // Also save locally as fallback
    localStorage.setItem(`dashboard_${household?.id}_${currentUser?.username}`, JSON.stringify(layouts));
  };

  const handleAddPage = () => {
    const nextPageIndex = Object.keys(layouts).length + 1;
    setLayouts(prev => ({
        ...prev,
        [nextPageIndex]: []
    }));
    setPage(nextPageIndex);
  };

  const handleRemovePage = () => {
    const pageKeys = Object.keys(layouts).sort((a,b) => a-b);
    if (pageKeys.length <= 1) return;
    
    const newLayouts = { ...layouts };
    delete newLayouts[page];

    // Re-index remaining pages
    const remainingValues = Object.values(newLayouts);
    const reindexed = {};
    remainingValues.forEach((val, idx) => {
        reindexed[idx + 1] = val;
    });

    setLayouts(reindexed);
    setPage(Math.max(1, page - 1));
  };

  const hour = new Date().getHours();
  let greeting = "Good evening";
  if (hour < 12) greeting = "Good morning";
  else if (hour < 17) greeting = "Good afternoon";

  const totalPages = Object.keys(layouts).length;

  return (
    <Box sx={{ pb: 10 }}>
      
      {/* HEADER */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: '300', mb: 0.5 }}>
            {greeting}, <Box component="span" sx={{ fontWeight: '700', color: 'primary.main' }}>{currentUser?.username || 'User'}</Box>
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {isEditing ? (
                <>
                    <Stack direction="row" spacing={1} sx={{ mr: 2 }}>
                        <Button 
                            variant="outlined" 
                            size="small"
                            startIcon={<AddCircleOutline />} 
                            onClick={handleAddPage}
                        >
                            Add Page
                        </Button>
                        {totalPages > 1 && (
                            <Button 
                                variant="outlined" 
                                size="small"
                                color="error"
                                startIcon={<RemoveCircleOutline />} 
                                onClick={handleRemovePage}
                            >
                                Remove Page
                            </Button>
                        )}
                    </Stack>
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
                        onClick={handleSave}
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

      {/* PAGE SWITCHER (Top of Widgets) */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
            <Pagination 
                count={totalPages} 
                page={page} 
                onChange={(e, v) => setPage(v)} 
                color="primary" 
                size="large"
                variant="outlined"
                shape="rounded"
            />
        </Box>
      )}

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

      {/* EMPTY STATE */}
      {currentItems.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary', border: '2px dashed', borderColor: 'divider', borderRadius: 4, mt: 2 }}>
              <Typography variant="h6">This page is empty.</Typography>
              {isEditing ? (
                  <Button sx={{ mt: 2 }} variant="contained" startIcon={<Add />} onClick={(e) => setAddWidgetAnchor(e.currentTarget)}>Add a widget</Button>
              ) : (
                  <Typography variant="body2">Click "Edit Dashboard" to add widgets here.</Typography>
              )}
          </Box>
      )}

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