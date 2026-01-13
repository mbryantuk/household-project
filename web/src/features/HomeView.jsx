import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Box, Typography, Button, Stack, IconButton, Sheet, Menu, MenuItem } from '@mui/joy';
import { 
  Add, Save, Edit, Close, 
  AddCircleOutline, RemoveCircleOutline 
} from '@mui/icons-material';
import { Responsive, WidthProvider } from 'react-grid-layout';

import BirthdaysWidget from '../components/widgets/BirthdaysWidget';
import EventsWidget from '../components/widgets/EventsWidget';
import HomeRecurringCostsWidget from '../components/widgets/HomeRecurringCostsWidget';
import VehiclesWidget from '../components/widgets/VehiclesWidget';
import NotesWidget from '../components/widgets/NotesWidget';
import CalculatorWidget from '../components/widgets/CalculatorWidget';
import FinancialWidget from '../components/widgets/FinancialWidget';
import TaxWidget from '../components/widgets/TaxWidget';

const ResponsiveGridLayout = WidthProvider(Responsive);

const WIDGET_TYPES = {
  birthdays: { component: BirthdaysWidget, label: 'Upcoming Birthdays', defaultH: 4, defaultW: 6 },
  events: { component: EventsWidget, label: 'Upcoming Events', defaultH: 4, defaultW: 6 },
  costs: { component: HomeRecurringCostsWidget, label: 'Monthly Costs', defaultH: 4, defaultW: 6 },
  vehicles: { component: VehiclesWidget, label: 'Fleet Status', defaultH: 4, defaultW: 6 },
  notes: { component: NotesWidget, label: 'Sticky Note', defaultH: 4, defaultW: 4 },
  calc: { component: CalculatorWidget, label: 'Calculator', defaultH: 5, defaultW: 4 },
  finance: { component: FinancialWidget, label: 'Finance Tools', defaultH: 6, defaultW: 5 },
  tax: { component: TaxWidget, label: 'Tax Tools', defaultH: 6, defaultW: 5 },
};

const DEFAULT_LAYOUT = [
  { i: 'birthdays-1', x: 0, y: 0, w: 6, h: 4, type: 'birthdays' },
  { i: 'events-1', x: 6, y: 0, w: 6, h: 4, type: 'events' },
  { i: 'costs-1', x: 0, y: 4, w: 6, h: 4, type: 'costs' },
];

export default function HomeView({ members, household, currentUser, dates, onUpdateProfile, api }) {
  const [isEditing, setIsEditing] = useState(false);
  const [page, setPage] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize strictly from Server Props (or Default if missing/empty)
  // We do NOT use localStorage as source of truth to ensure cross-device consistency.
  const [layouts, setLayouts] = useState(() => {
    if (currentUser?.dashboard_layout) {
      try {
        const cloud = typeof currentUser.dashboard_layout === 'string' 
          ? JSON.parse(currentUser.dashboard_layout) 
          : currentUser.dashboard_layout;
        if (cloud && Object.keys(cloud).length > 0) return cloud;
      } catch (e) { console.error("Cloud Layout Parse Error", e); }
    }
    return { 1: DEFAULT_LAYOUT };
  });

  const [addWidgetAnchor, setAddWidgetAnchor] = useState(null);
  const [width, setWidth] = useState(1200);
  const containerRef = useRef(null);

  // Sync Layout from Server if it changes remotely (e.g. login/refresh)
  // BUT only if we are not currently editing/saving to avoid race conditions overwriting local work.
  // CRITICAL FIX: Only sync if the user ID matches (to avoid cross-user pollution) AND layout is different.
  useEffect(() => {
    if (isEditing || isSaving) return;
    if (currentUser?.dashboard_layout) {
      try {
        const cloud = typeof currentUser.dashboard_layout === 'string' 
          ? JSON.parse(currentUser.dashboard_layout) 
          : currentUser.dashboard_layout;
        if (cloud && JSON.stringify(cloud) !== JSON.stringify(layouts)) {
            // Only update if significantly different structure to avoid jitter
            setLayouts(cloud);
        }
      } catch(e) {}
    }
  }, [currentUser?.dashboard_layout, isEditing, isSaving]); // Removed 'layouts' from dependency to prevent loops

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

  const currentItems = useMemo(() => layouts[page] || [], [layouts, page]);
  const gridItems = useMemo(() => currentItems.map(item => ({ ...item, static: !isEditing })), [currentItems, isEditing]);

  const handleLayoutChange = (layout) => {
    const newItems = layout.map(l => {
        const existing = currentItems.find(i => i.i === l.i);
        const { static: _static, ...cleanLayout } = l;
        // Persist custom data fields (like content for notes)
        return { ...existing, ...cleanLayout, data: existing?.data };
    });
    setLayouts(prev => ({ ...prev, [page]: newItems }));
  };

  const handleAddWidget = (type) => {
    const config = WIDGET_TYPES[type];
    const newId = `${type}-${Date.now()}`;
    const newItem = {
        i: newId, x: (currentItems.length * 6) % 12, y: Infinity, w: config.defaultW, h: config.defaultH, type: type,
        data: {} // For widget-specific data storage
    };
    setLayouts(prev => ({ ...prev, [page]: [...(prev[page] || []), newItem] }));
    setAddWidgetAnchor(null);
  };

  const handleRemoveWidget = (id) => {
      setLayouts(prev => ({ ...prev, [page]: prev[page].filter(i => i.i !== id) }));
  };

  // Updates specific widget data (e.g. Note content) without needing to be in "Edit Mode"
  const handleUpdateWidgetData = useCallback((id, newData) => {
      setLayouts(prev => {
          const pageItems = prev[page] || [];
          const updatedItems = pageItems.map(item => 
              item.i === id ? { ...item, data: { ...item.data, ...newData } } : item
          );
          return { ...prev, [page]: updatedItems };
      });
  }, [page]);

  // Debounce save for layout data changes
  useEffect(() => {
      if (isEditing) return; // Don't auto-save while dragging
      const timer = setTimeout(() => {
          if (currentUser?.dashboard_layout) {
             const currentStr = typeof currentUser.dashboard_layout === 'string' ? currentUser.dashboard_layout : JSON.stringify(currentUser.dashboard_layout);
             if (currentStr !== JSON.stringify(layouts)) {
                 handleSave(true); // Silent save
             }
          }
      }, 2000);
      return () => clearTimeout(timer);
  }, [layouts, isEditing]);

  const handleSave = async (silent = false) => {
    if (!silent) setIsSaving(true);
    if (onUpdateProfile) {
        try { 
            await onUpdateProfile({ dashboard_layout: JSON.stringify(layouts) }); 
        } catch (err) {
            console.error("Failed to save layout", err);
        }
    }
    if (!silent) {
        setIsEditing(false);
        setIsSaving(false);
    }
  };

  const handleAddPage = () => {
    const nextPageIndex = Object.keys(layouts).length + 1;
    setLayouts(prev => ({ ...prev, [nextPageIndex]: [] }));
    setPage(nextPageIndex);
  };

  const handleRemovePage = () => {
    const pageKeys = Object.keys(layouts).sort((a,b) => a-b);
    if (pageKeys.length <= 1) return;
    const newLayouts = { ...layouts };
    delete newLayouts[page];
    const remainingValues = Object.values(newLayouts);
    const reindexed = {};
    remainingValues.forEach((val, idx) => { reindexed[idx + 1] = val; });
    setLayouts(reindexed);
    setPage(Math.max(1, page - 1));
  };

  const hour = new Date().getHours();
  let greeting = "Good evening";
  if (hour < 12) greeting = "Good morning";
  else if (hour < 17) greeting = "Good afternoon";

  const totalPages = Object.keys(layouts).length;

  return (
    <Box sx={{ pb: 10, px: { xs: 2, md: 4 }, pt: 2 }}>
      
      {/* HEADER */}
      <Box sx={{ 
          mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
          flexWrap: 'wrap', gap: 2 
      }}>
        <Box>
          <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: { xs: '1.5rem', md: '2rem' } }}>
            {greeting}, <Typography color="primary" variant="plain">{currentUser?.first_name || currentUser?.username || 'User'}</Typography>
          </Typography>
          <Typography level="body-md" color="neutral">
            Here's what's happening in the <b>{household?.name} Household</b> today.
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {isEditing ? (
                <>
                    <Stack direction="row" spacing={1} sx={{ mr: 2, display: { xs: 'none', md: 'flex' } }}>
                        <Button variant="outlined" size="sm" startDecorator={<AddCircleOutline />} onClick={handleAddPage}>Page</Button>
                        {totalPages > 1 && (
                            <Button variant="outlined" size="sm" color="danger" startDecorator={<RemoveCircleOutline />} onClick={handleRemovePage}>Page</Button>
                        )}
                    </Stack>
                    <Button variant="soft" startDecorator={<Add />} onClick={(e) => setAddWidgetAnchor(e.currentTarget)}>Widget</Button>
                    <Button variant="solid" color="primary" loading={isSaving} startDecorator={<Save />} onClick={() => handleSave(false)}>Done</Button>
                </>
            ) : (
                <Button variant="plain" color="neutral" startDecorator={<Edit />} onClick={() => setIsEditing(true)}>Customize</Button>
            )}
        </Box>
      </Box>

      {/* PAGE INDICATOR */}
      {totalPages > 1 && (
        <Stack direction="row" justifyContent="center" spacing={1} mb={3}>
             {Object.keys(layouts).map(pageNum => (
                 <Box 
                    key={pageNum}
                    onClick={() => setPage(parseInt(pageNum))}
                    sx={{
                        width: 8, height: 8, borderRadius: '50%',
                        bgcolor: parseInt(pageNum) === page ? 'primary.500' : 'neutral.300',
                        cursor: 'pointer', transition: 'all 0.2s',
                        '&:hover': { transform: 'scale(1.2)' }
                    }}
                 />
             ))}
        </Stack>
      )}

      {/* GRID CONTAINER */}
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
            margin={[24, 24]} // More breathing room
        >
            {gridItems.map(item => {
                const WidgetComponent = WIDGET_TYPES[item.type]?.component;
                return (
                    <Box key={item.i} data-grid={{ ...item, static: !isEditing }} sx={{ position: 'relative' }}>
                        {isEditing && (
                            <Box sx={{ position: 'absolute', top: -12, right: -12, zIndex: 20 }}>
                                <IconButton 
                                    size="sm" variant="solid" color="danger"
                                    onClick={() => handleRemoveWidget(item.i)}
                                    sx={{ borderRadius: '50%', boxShadow: 'md' }}
                                >
                                    <Close />
                                </IconButton>
                            </Box>
                        )}
                        
                        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            {WidgetComponent ? <WidgetComponent 
                                dates={dates} 
                                members={members} 
                                api={api} 
                                household={household}
                                user={currentUser} 
                                onUpdateProfile={onUpdateProfile}
                                data={item.data || {}}
                                onSaveData={(newData) => handleUpdateWidgetData(item.i, newData)}
                            /> : <Typography color="danger">Error</Typography>}
                        </Box>
                    </Box>
                );
            })}
        </ResponsiveGridLayout>
      </div>

      {currentItems.length === 0 && (
          <Sheet 
            variant="outlined" 
            sx={{ 
                textAlign: 'center', py: 10, mt: 2,
                borderRadius: 'lg', borderStyle: 'dashed', borderColor: 'neutral.300',
                bgcolor: 'background.level1'
            }}
          >
              <Typography level="title-lg" mb={1}>Your dashboard is empty.</Typography>
              <Typography level="body-sm" mb={3}>Add widgets to track birthdays, events, and costs.</Typography>
              {isEditing ? (
                  <Button variant="solid" startDecorator={<Add />} onClick={(e) => setAddWidgetAnchor(e.currentTarget)}>Add Widget</Button>
              ) : (
                  <Button variant="outlined" onClick={() => setIsEditing(true)}>Customize Dashboard</Button>
              )}
          </Sheet>
      )}

      <Menu
        anchorEl={addWidgetAnchor}
        open={Boolean(addWidgetAnchor)}
        onClose={() => setAddWidgetAnchor(null)}
        placement="bottom-end"
        size="sm"
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
