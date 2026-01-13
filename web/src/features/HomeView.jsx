import { Responsive as ResponsiveGridLayout } from 'react-grid-layout';
import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Box, Typography, IconButton, Button, Menu, MenuItem, 
  Stack, Sheet, Tooltip
} from '@mui/joy';
import { 
  Edit, Save, Add, Close, 
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

const DEFAULT_LAYOUT = [
  { i: 'birthdays-1', x: 0, y: 0, w: 6, h: 4, type: 'birthdays' },
  { i: 'events-1', x: 6, y: 0, w: 6, h: 4, type: 'events' },
];

export default function HomeView({ members, household, currentUser, dates, onUpdateProfile }) {
  const [isEditing, setIsEditing] = useState(false);
  const [page, setPage] = useState(1);
  const [layouts, setLayouts] = useState(() => {
    if (currentUser?.dashboard_layout) {
      try {
        const cloud = typeof currentUser.dashboard_layout === 'string' 
          ? JSON.parse(currentUser.dashboard_layout) 
          : currentUser.dashboard_layout;
        if (cloud && Object.keys(cloud).length > 0) return cloud;
      } catch (e) { console.error("Cloud Layout Parse Error", e); }
    }
    const saved = localStorage.getItem(`dashboard_${household?.id}_${currentUser?.username}`);
    return saved ? JSON.parse(saved) : { 1: DEFAULT_LAYOUT };
  });

  const [addWidgetAnchor, setAddWidgetAnchor] = useState(null);
  const [width, setWidth] = useState(1200);
  const containerRef = useRef(null);

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
        return { ...existing, ...cleanLayout };
    });
    setLayouts(prev => ({ ...prev, [page]: newItems }));
  };

  const handleAddWidget = (type) => {
    const config = WIDGET_TYPES[type];
    const newId = `${type}-${Date.now()}`;
    const newItem = {
        i: newId, x: (currentItems.length * 6) % 12, y: Infinity, w: config.defaultW, h: config.defaultH, type: type
    };
    setLayouts(prev => ({ ...prev, [page]: [...(prev[page] || []), newItem] }));
    setAddWidgetAnchor(null);
  };

  const handleRemoveWidget = (id) => {
      setLayouts(prev => ({ ...prev, [page]: prev[page].filter(i => i.i !== id) }));
  };

  const handleSave = async () => {
    setIsEditing(false);
    if (onUpdateProfile) {
        try { await onUpdateProfile({ dashboard_layout: JSON.stringify(layouts) }); } catch (err) {}
    }
    localStorage.setItem(`dashboard_${household?.id}_${currentUser?.username}`, JSON.stringify(layouts));
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
            <Typography level="body-xs" variant="soft" color="primary" sx={{ ml: 1, verticalAlign: 'middle' }}>v2.1 (Mobile Fix)</Typography>
          </Typography>
          <Typography level="body-md" color="neutral">
            Here's what's happening in <b>{household?.name} Household</b> today.
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
                    <Button variant="solid" color="primary" startDecorator={<Save />} onClick={handleSave}>Done</Button>
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
                            {WidgetComponent ? <WidgetComponent dates={dates} members={members} /> : <Typography color="danger">Error</Typography>}
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
