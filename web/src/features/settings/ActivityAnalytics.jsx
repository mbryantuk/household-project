import React from 'react';
import { Box, Typography, Card, CircularProgress, Stack, Tooltip } from '@mui/joy';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';

/**
 * ActivityAnalytics
 * Item 265: Engagement Heatmap (Stacked Bar Chart)
 */
export default function ActivityAnalytics() {
  const { api, household } = useOutletContext();
  const householdId = household?.id;

  const { data: stats, isLoading } = useQuery({
    queryKey: ['households', householdId, 'activity-stats'],
    queryFn: () => api.get(`/households/${householdId}/stats/activity`).then((res) => res.data),
    enabled: !!householdId,
  });

  if (isLoading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 10 }}>
        <CircularProgress />
      </Box>
    );

  if (!stats || !stats.data?.length) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography level="body-md" color="neutral">
          No activity recorded in the last 30 days.
        </Typography>
      </Box>
    );
  }

  // Generate a color for each member
  const getColor = (idx) => {
    const colors = ['#0B6BCB', '#1F7A1F', '#9B5DE5', '#F15BB5', '#FEE440', '#00BBF9', '#00F5D4'];
    return colors[idx % colors.length];
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography level="h3" sx={{ mb: 1 }}>
        Household Engagement
      </Typography>
      <Typography level="body-md" color="neutral" sx={{ mb: 4 }}>
        Measuring member activity across modules over the last 30 days.
      </Typography>

      <Card variant="outlined" sx={{ p: 4, bgcolor: 'background.level1' }}>
        <Box sx={{ height: 400, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={stats.data}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis type="number" fontSize={12} />
              <YAxis
                dataKey="module"
                type="category"
                fontSize={12}
                width={100}
                tickFormatter={(val) => val?.charAt(0).toUpperCase() + val?.slice(1)}
              />
              <ChartTooltip cursor={{ fill: 'transparent' }} />
              <Legend />
              {stats.members.map((member, idx) => (
                <Bar
                  key={member}
                  dataKey={member}
                  stackId="a"
                  fill={getColor(idx)}
                  radius={idx === stats.members.length - 1 ? [0, 4, 4, 0] : [0, 0, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Card>

      <Stack spacing={2} sx={{ mt: 4 }}>
        <Typography level="title-md">Insights</Typography>
        {stats.modules.length < 5 && (
          <Typography level="body-sm" color="warning">
            ⚠️ You're only using {stats.modules.length} modules. Try exploring 'Chores' or 'Meal
            Planner' to get more value from Hearthstone!
          </Typography>
        )}
        <Typography level="body-sm" color="neutral">
          * Activity is tracked whenever a member creates, updates, or deletes an item in the
          system.
        </Typography>
      </Stack>
    </Box>
  );
}
