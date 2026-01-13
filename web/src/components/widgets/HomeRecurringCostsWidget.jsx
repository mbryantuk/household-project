import { useState, useEffect } from 'react';
import { Box, Typography, List, ListItem, ListItemContent, Chip, CircularProgress } from '@mui/joy';
import { ReceiptLong } from '@mui/icons-material';
import WidgetWrapper from './WidgetWrapper';

export default function HomeRecurringCostsWidget({ api, household, dates }) {
  const [costs, setCosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!api || !household) return;
    const fetchCosts = async () => {
      try {
        const res = await api.get(`/households/${household.id}/costs`);
        // Calculate upcoming occurrences logic could be complex (recurrence expansion).
        // For simplicity in this prototype, we list the costs and their next payment day.
        // Ideally, the 'dates' prop already contains expanded cost events if the backend/calendar logic does it.
        // Checking 'dates' first.
        
        // Strategy: Filter 'dates' for type='finance' or similar if they exist.
        // If not, just list the raw costs.
        setCosts(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCosts();
  }, [api, household]);

  // Sort by payment day
  const sortedCosts = [...costs].sort((a, b) => (a.payment_day || 32) - (b.payment_day || 32));

  return (
    <WidgetWrapper title="Monthly Costs" icon={<ReceiptLong />} color="warning">
      {loading ? <CircularProgress size="sm" /> : (
        <List size="sm" sx={{ '--ListItem-paddingY': '4px' }}>
          {sortedCosts.slice(0, 5).map(cost => (
            <ListItem key={cost.id}>
              <ListItemContent>
                <Typography level="body-sm" fontWeight="bold">{cost.name}</Typography>
                <Typography level="body-xs">Day {cost.payment_day}</Typography>
              </ListItemContent>
              <Chip size="sm" variant="soft" color="warning">£{cost.amount}</Chip>
            </ListItem>
          ))}
          {sortedCosts.length === 0 && <Typography level="body-xs">No recurring costs.</Typography>}
        </List>
      )}
    </WidgetWrapper>
  );
}
