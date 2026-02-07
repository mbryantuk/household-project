import React, { useState, useEffect } from 'react';
import { 
  Box, Modal, ModalDialog, ModalClose, Typography, Stack, 
  Button, IconButton, CircularProgress, Sheet, Grid, Divider
} from '@mui/joy';
import { 
  EmojiEvents, TrendingUp, TrendingDown, 
  ChevronLeft, ChevronRight, Celebration, 
  MonetizationOn, Category, Insights
} from '@mui/icons-material';

const STORY_PAGES = [
  'intro',
  'total_spend',
  'comparison',
  'categories',
  'top_spend',
  'outro'
];

export default function MonthlyWrapUpModal({ open, onClose, data, monthName }) {
  const [currentPage, setCurrentPage] = useState(0);
  
  useEffect(() => {
    if (open) setCurrentPage(0);
  }, [open]);

  const next = () => setCurrentPage(p => Math.min(p + 1, STORY_PAGES.length - 1));
  const prev = () => setCurrentPage(p => Math.max(p - 0, 0));

  if (!data) return null;

  const { total_spent, prev_month_spent, delta_percent, costs } = data;
  const isUp = delta_percent > 0;
  const formatCurrency = (val) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(val);

  const renderPage = () => {
    const pageType = STORY_PAGES[currentPage];

    switch (pageType) {
      case 'intro':
        return (
          <Stack spacing={2} alignItems="center" justifyContent="center" sx={{ height: '100%', textAlign: 'center' }}>
            <Celebration sx={{ fontSize: 80, color: 'warning.500' }} />
            <Typography level="h1" sx={{ fontSize: '3rem', fontWeight: 'xl' }}>{monthName} Wrapped</Typography>
            <Typography level="title-lg">Let's see how your household did this month.</Typography>
            <Button size="lg" variant="solid" color="primary" onClick={next} sx={{ mt: 4, borderRadius: 'xl', px: 4 }}>
              Start the Show
            </Button>
          </Stack>
        );

      case 'total_spend':
        return (
          <Stack spacing={2} alignItems="center" justifyContent="center" sx={{ height: '100%', textAlign: 'center' }}>
            <Typography level="title-lg" color="neutral">You spent a total of</Typography>
            <Typography level="h1" sx={{ fontSize: '4rem', fontWeight: 'xl', color: 'primary.solidBg' }}>
              {formatCurrency(total_spent)}
            </Typography>
            <Typography level="body-lg">across all your tracked household costs.</Typography>
            <MonetizationOn sx={{ fontSize: 40, mt: 2, opacity: 0.5 }} />
          </Stack>
        );

      case 'comparison':
        return (
          <Stack spacing={2} alignItems="center" justifyContent="center" sx={{ height: '100%', textAlign: 'center' }}>
            <Typography level="title-lg" color="neutral">Compared to last month...</Typography>
            <Box sx={{ p: 4, borderRadius: '50%', bgcolor: isUp ? 'danger.softBg' : 'success.softBg', display: 'flex' }}>
              {isUp ? <TrendingUp sx={{ fontSize: 60, color: 'danger.500' }} /> : <TrendingDown sx={{ fontSize: 60, color: 'success.500' }} />}
            </Box>
            <Typography level="h2" color={isUp ? 'danger' : 'success'}>
              {Math.abs(delta_percent).toFixed(1)}% {isUp ? 'More' : 'Less'}
            </Typography>
            <Typography level="body-lg">
              Last month you spent {formatCurrency(prev_month_spent)}.
            </Typography>
          </Stack>
        );

      case 'categories':
        // Group by category
        const cats = {};
        costs.forEach(c => {
          cats[c.category] = (cats[c.category] || 0) + c.amount;
        });
        const sortedCats = Object.entries(cats).sort((a, b) => b[1] - a[1]);

        return (
          <Stack spacing={3} sx={{ height: '100%', pt: 4 }}>
            <Typography level="h2" textAlign="center">Where did it go?</Typography>
            <Stack spacing={2}>
              {sortedCats.slice(0, 4).map(([cat, amt]) => (
                <Sheet key={cat} variant="soft" sx={{ p: 2, borderRadius: 'md', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography level="title-md" sx={{ textTransform: 'capitalize' }}>{cat.replace('_', ' ')}</Typography>
                  <Typography level="title-lg" fontWeight="xl">{formatCurrency(amt)}</Typography>
                </Sheet>
              ))}
            </Stack>
            <Box sx={{ textAlign: 'center' }}>
                <Category sx={{ fontSize: 40, opacity: 0.3 }} />
            </Box>
          </Stack>
        );

      case 'top_spend':
        const top = costs[0];
        return (
          <Stack spacing={2} alignItems="center" justifyContent="center" sx={{ height: '100%', textAlign: 'center' }}>
            <Typography level="title-lg" color="neutral">Your biggest single cost was</Typography>
            <Sheet variant="outlined" sx={{ p: 4, borderRadius: 'xl', border: '4px solid', borderColor: 'warning.500', boxShadow: 'xl' }}>
                <Typography level="h2">{top?.name || 'Nothing recorded'}</Typography>
                <Typography level="h1" color="primary">{formatCurrency(top?.amount || 0)}</Typography>
            </Sheet>
            <Typography level="body-md">Ouch! (or maybe it was worth it?)</Typography>
          </Stack>
        );

      case 'outro':
        return (
          <Stack spacing={2} alignItems="center" justifyContent="center" sx={{ height: '100%', textAlign: 'center' }}>
            <Insights sx={{ fontSize: 80, color: 'primary.500' }} />
            <Typography level="h2">That's your wrap!</Typography>
            <Typography level="body-lg">Keep up the good work managing your home.</Typography>
            <Button size="lg" variant="outlined" color="neutral" onClick={onClose} sx={{ mt: 4, borderRadius: 'xl' }}>
              Close Wrap-Up
            </Button>
          </Stack>
        );

      default:
        return null;
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog 
        variant="plain" 
        sx={{ 
          width: '100vw', 
          height: '100dvh', 
          maxWidth: '100vw', 
          maxHeight: '100dvh', 
          p: 0, 
          borderRadius: 0,
          bgcolor: 'background.body',
          overflow: 'hidden'
        }}
      >
        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 8, display: 'flex', gap: 1, p: 1, zIndex: 10 }}>
           {STORY_PAGES.map((_, i) => (
             <Box 
               key={i} 
               sx={{ 
                 flex: 1, 
                 height: 4, 
                 borderRadius: 2, 
                 bgcolor: i <= currentPage ? 'primary.solidBg' : 'neutral.softBg',
                 transition: 'background-color 0.3s'
               }} 
             />
           ))}
        </Box>

        <ModalClose variant="plain" sx={{ top: 20, right: 20, zIndex: 20 }} />

        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: { xs: 3, md: 8 }, pt: 6 }}>
          <Box sx={{ flexGrow: 1 }}>
            {renderPage()}
          </Box>

          <Stack direction="row" spacing={2} justifyContent="space-between" sx={{ pb: 4 }}>
            <IconButton 
                disabled={currentPage === 0} 
                onClick={prev} 
                variant="plain" 
                size="lg"
                sx={{ borderRadius: '50%' }}
            >
              <ChevronLeft />
            </IconButton>
            
            {currentPage < STORY_PAGES.length - 1 && (
                <Button 
                    variant="soft" 
                    endDecorator={<ChevronRight />} 
                    onClick={next}
                    sx={{ borderRadius: 'xl', px: 4 }}
                >
                    Next
                </Button>
            )}
          </Stack>
        </Box>
      </ModalDialog>
    </Modal>
  );
}
