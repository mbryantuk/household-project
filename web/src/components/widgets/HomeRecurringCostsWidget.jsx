import { useState, useEffect } from 'react';
import { Typography, List, ListItem, ListItemContent, Chip, CircularProgress, Box } from '@mui/joy';
import { ReceiptLong } from '@mui/icons-material';
import WidgetWrapper from './WidgetWrapper';

export default function HomeRecurringCostsWidget({ api, household }) {
  const [costs, setCosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!api || !household) return;
    const fetchCosts = async () => {
      try {
        // Fix: Use correct endpoint
        const res = await api.get(`/households/${household.id}/finance/charges`);
        // Filter for active recurring costs
        const active = (res.data || []).filter(c => c.is_active !== 0 && c.frequency !== 'one_off');
        setCosts(active);
      } catch (err) {
        console.error("Failed to fetch recurring costs", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCosts();
  }, [api, household]);

  // Sort by day of month (or day 1 as fallback)
  const sortedCosts = [...costs].sort((a, b) => (a.day_of_month || 1) - (b.day_of_month || 1));

  return (
    <WidgetWrapper title="Monthly Costs" icon={<ReceiptLong />} color="warning">
      {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress size="sm" /></Box> : (
        <List size="sm" sx={{ '--ListItem-paddingY': '4px' }}>
          {sortedCosts.slice(0, 5).map(cost => (
            <ListItem key={cost.id}>
              <ListItemContent>
                <Typography level="body-sm" fontWeight="bold">{cost.name}</Typography>
                <Typography level="body-xs">{cost.frequency === 'weekly' ? 'Weekly' : `Day ${cost.day_of_month || 1}`}</Typography>
              </ListItemContent>
              <Chip size="sm" variant="soft" color="warning">£{Number(cost.amount).toFixed(2)}</Chip>
            </ListItem>
          ))}
          {sortedCosts.length === 0 && <Typography level="body-xs" sx={{ p: 2, textAlign: 'center', color: 'neutral.500' }}>No recurring costs.</Typography>}
        </List>
      )}
    </WidgetWrapper>
  );
}