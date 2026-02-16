import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Box, Typography, Sheet, Table, Avatar, CircularProgress, 
  Stack, Divider, Card, Chip, Select, Option
} from '@mui/joy';
import { TrendingUp, TrendingDown, Remove, History } from '@mui/icons-material';

const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return num.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' });
};

export default function ShoppingTrends({ api, householdId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTrends = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/households/${householdId}/shopping-list?all=true`);
      setData(res.data.items || []);
    } catch (err) {
      console.error("Trend fetch failed", err);
    } finally {
      setLoading(false);
    }
  }, [api, householdId]);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  const trends = useMemo(() => {
      // Group by item name and find price changes
      const groups = {};
      data.filter(i => i.estimated_cost > 0).forEach(item => {
          const name = item.name.toLowerCase().trim();
          if (!groups[name]) groups[name] = [];
          groups[name].push(item);
      });

      const processed = Object.entries(groups)
        .map(([, instances]) => {
            // Sort by date (week_start or created_at)
            const sorted = instances.sort((a, b) => new Date(a.week_start || a.created_at) - new Date(b.week_start || b.created_at));
            const latest = sorted[sorted.length - 1];
            const previous = sorted.length > 1 ? sorted[sorted.length - 2] : null;
            
            let change = 0;
            if (previous) {
                change = latest.estimated_cost - previous.estimated_cost;
            }

            return {
                name: latest.name,
                current_price: latest.estimated_cost,
                previous_price: previous ? previous.estimated_cost : null,
                change,
                instances: sorted.length
            };
        })
        .filter(t => t.instances > 1) 
        .sort((a, b) => b.change - a.change); 

      return processed;
  }, [data]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>;

  return (
    <Card variant="outlined" sx={{ mt: 3 }}>
        <Typography level="title-md" startDecorator={<TrendingUp />}>Price Trends (Recurring Items)</Typography>
        <Typography level="body-xs" color="neutral" sx={{ mb: 2 }}>Compare current vs previous prices for frequently bought items.</Typography>
        
        <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
            <Table size="sm" stickyHeader>
                <thead>
                    <tr>
                        <th>Item</th>
                        <th style={{ textAlign: 'right' }}>Price</th>
                        <th style={{ textAlign: 'center' }}>Change</th>
                    </tr>
                </thead>
                <tbody>
                    {trends.map((t, idx) => (
                        <tr key={idx}>
                            <td>
                                <Typography level="body-xs" fontWeight="bold" noWrap>{t.name}</Typography>
                                <Typography level="body-xs" color="neutral">{t.instances} purchases</Typography>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                                <Typography level="body-xs">{formatCurrency(t.current_price)}</Typography>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                                <Chip 
                                    size="sm" 
                                    variant="soft" 
                                    color={t.change > 0 ? 'danger' : t.change < 0 ? 'success' : 'neutral'}
                                    startDecorator={t.change > 0 ? <TrendingUp /> : t.change < 0 ? <TrendingDown /> : <Remove />}
                                >
                                    {t.change !== 0 ? formatCurrency(Math.abs(t.change)) : '-'}
                                </Chip>
                            </td>
                        </tr>
                    ))}
                    {trends.length === 0 && (
                        <tr>
                            <td colSpan={3} style={{ textAlign: 'center', padding: '20px', opacity: 0.5 }}>
                                Need more data to calculate trends.
                            </td>
                        </tr>
                    )}
                </tbody>
            </Table>
        </Box>
    </Card>
  );
}
