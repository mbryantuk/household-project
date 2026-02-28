import React, { useState } from 'react';
import {
  Box,
  Typography,
  Table,
  Button,
  Input,
  FormControl,
  FormLabel,
  Stack,
  IconButton,
  Sheet,
  Card,
  Grid,
} from '@mui/joy';
import { Add, Speed, Delete, History } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

/**
 * MileageLogTab
 * Item 261: Track vehicle mileage history and visualize trends.
 */
export default function MileageLogTab({ api, householdId, vehicleId }) {
  const queryClient = useQueryClient();
  const [newMileage, setNewMileage] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);

  // 1. Fetch Logs
  const { data: logs = [] } = useQuery({
    queryKey: ['households', householdId, 'vehicles', vehicleId, 'mileage'],
    queryFn: () =>
      api
        .get(`/households/${householdId}/vehicles/${vehicleId}/mileage`)
        .then((res) => res.data || []),
    enabled: !!vehicleId,
  });

  // 2. Add Mutation
  const addMutation = useMutation({
    mutationFn: (data) =>
      api.post(`/households/${householdId}/vehicles/${vehicleId}/mileage`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['households', householdId, 'vehicles', vehicleId, 'mileage'],
      });
      queryClient.invalidateQueries({ queryKey: ['households', householdId, 'vehicles'] });
      setNewMileage('');
    },
  });

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newMileage) return;
    addMutation.mutate({ mileage: parseInt(newMileage), date: newDate });
  };

  const chartData = [...logs].reverse().map((l) => ({
    date: new Date(l.date).toLocaleDateString(),
    mileage: l.mileage,
  }));

  return (
    <Stack spacing={4}>
      {/* 📈 Visualization */}
      {logs.length >= 2 && (
        <Card variant="soft">
          <Typography level="title-md" startDecorator={<History />}>
            Mileage Trend
          </Typography>
          <Box sx={{ height: 250, mt: 2 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="mileage"
                  stroke="var(--joy-palette-primary-solidBg)"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </Card>
      )}

      {/* ➕ Quick Add */}
      <Card variant="outlined" sx={{ p: 2 }}>
        <form onSubmit={handleAdd}>
          <Grid container spacing={2} alignItems="flex-end">
            <Grid xs={12} md={5}>
              <FormControl required>
                <FormLabel>New Odometer Reading</FormLabel>
                <Input
                  type="number"
                  startDecorator={<Speed />}
                  value={newMileage}
                  onChange={(e) => setNewMileage(e.target.value)}
                  placeholder="e.g. 45000"
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
                Log Miles
              </Button>
            </Grid>
          </Grid>
        </form>
      </Card>

      {/* 📜 History Table */}
      <Sheet variant="outlined" sx={{ borderRadius: 'sm', overflow: 'hidden' }}>
        <Table hoverRow>
          <thead>
            <tr>
              <th>Date</th>
              <th>Mileage</th>
              <th>Increase</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, idx) => {
              const prev = logs[idx + 1];
              const diff = prev ? log.mileage - prev.mileage : null;
              return (
                <tr key={log.id}>
                  <td>{new Date(log.date).toLocaleDateString()}</td>
                  <td>{log.mileage.toLocaleString()}</td>
                  <td>
                    {diff !== null && (
                      <Typography level="body-xs" color={diff >= 0 ? 'success' : 'danger'}>
                        {diff >= 0 ? '+' : ''}
                        {diff.toLocaleString()} miles
                      </Typography>
                    )}
                  </td>
                </tr>
              );
            })}
            {logs.length === 0 && (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', padding: '20px' }}>
                  No mileage logs yet.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </Sheet>
    </Stack>
  );
}
