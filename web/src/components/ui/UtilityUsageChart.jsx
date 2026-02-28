import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Table,
  Button,
  Input,
  FormControl,
  FormLabel,
  Stack,
  Card,
  Grid,
  Sheet,
  Divider,
} from '@mui/joy';
import { Add, Timeline, ShowChart } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

/**
 * UtilityUsageChart
 * Item 262: Advanced Energy Analytics - Reading history and Bar Chart
 */
export default function UtilityUsageChart({ api, householdId, type, accountId, unit = 'kWh' }) {
  const queryClient = useQueryClient();
  const [newValue, setNewValue] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);

  // 1. Fetch Readings
  const { data: readings = [] } = useQuery({
    queryKey: ['households', householdId, 'utilities', type, 'readings'],
    queryFn: () =>
      api
        .get(`/households/${householdId}/utilities/${type}/readings`)
        .then((res) => res.data || []),
    enabled: !!householdId,
  });

  // 2. Mutation
  const addMutation = useMutation({
    mutationFn: (data) => api.post(`/households/${householdId}/utilities/${type}/readings`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['households', householdId, 'utilities', type, 'readings'],
      });
      setNewValue('');
    },
  });

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newValue) return;
    addMutation.mutate({
      account_id: accountId,
      value: parseFloat(newValue),
      reading_date: newDate,
      unit,
    });
  };

  // 3. Process data for Chart (Monthly Aggregation)
  const chartData = useMemo(() => {
    const months = {};
    [...readings].reverse().forEach((r) => {
      const month = r.reading_date.substring(0, 7); // YYYY-MM
      if (!months[month]) months[month] = { month, value: 0 };
      months[month].value += r.value;
    });
    return Object.values(months);
  }, [readings]);

  return (
    <Stack spacing={4} sx={{ mt: 4 }}>
      <Divider>Usage Analytics</Divider>

      {/* 📊 Chart */}
      {chartData.length > 0 && (
        <Card variant="soft">
          <Typography level="title-md" startDecorator={<Timeline />}>
            Monthly {type.toUpperCase()} Usage ({unit})
          </Typography>
          <Box sx={{ height: 300, mt: 2 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="value"
                  name="Consumption"
                  fill="var(--joy-palette-primary-solidBg)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Card>
      )}

      {/* ➕ Quick Add */}
      <Card variant="outlined" sx={{ p: 2 }}>
        <Typography level="title-sm" sx={{ mb: 2 }}>
          Log Meter Reading
        </Typography>
        <form onSubmit={handleAdd}>
          <Grid container spacing={2} alignItems="flex-end">
            <Grid xs={12} md={5}>
              <FormControl required>
                <FormLabel>Reading Value ({unit})</FormLabel>
                <Input
                  type="number"
                  step="0.01"
                  startDecorator={<ShowChart />}
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="e.g. 1234.56"
                />
              </FormControl>
            </Grid>
            <Grid xs={12} md={4}>
              <FormControl required>
                <FormLabel>Date</FormLabel>
                <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
              </FormControl>
            </Grid>
            <Grid xs={12} md={3}>
              <Button
                type="submit"
                fullWidth
                startDecorator={<Add />}
                loading={addMutation.isPending}
              >
                Log Reading
              </Button>
            </Grid>
          </Grid>
        </form>
      </Card>

      {/* 📜 History */}
      <Sheet variant="outlined" sx={{ borderRadius: 'sm', overflow: 'hidden' }}>
        <Table hoverRow size="sm">
          <thead>
            <tr>
              <th>Date</th>
              <th>Reading</th>
              <th>Unit</th>
            </tr>
          </thead>
          <tbody>
            {readings.map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.reading_date).toLocaleDateString()}</td>
                <td>{r.value.toLocaleString()}</td>
                <td>{r.unit}</td>
              </tr>
            ))}
            {readings.length === 0 && (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', padding: '20px' }}>
                  No readings recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </Sheet>
    </Stack>
  );
}
