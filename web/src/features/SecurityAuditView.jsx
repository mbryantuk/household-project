import React, { useMemo } from 'react';
import { Box, Typography, Chip, Stack, Card } from '@mui/joy';
import { Security, History } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import AppTable from '../components/ui/AppTable';
import ModuleContainer from '../components/ui/ModuleContainer';
import EmojiAvatar from '../components/ui/EmojiAvatar';

/**
 * Security Audit View
 * Displays the immutable audit trail from Postgres.
 */
export default function SecurityAuditView({ api, householdId }) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-logs', householdId],
    queryFn: async () => {
      const res = await api.get(`/admin/audit-logs?householdId=${householdId}`);
      return res.data;
    },
    enabled: !!householdId,
  });

  const columns = useMemo(
    () => [
      {
        field: 'action',
        headerName: 'Action',
        width: 200,
        renderCell: (params) => (
          <Chip variant="soft" color="primary" size="sm" startDecorator={<History />}>
            {params.value}
          </Chip>
        ),
      },
      {
        field: 'entityType',
        headerName: 'Object',
        width: 150,
        renderCell: (params) => (
          <Typography level="body-xs" sx={{ textTransform: 'capitalize' }}>
            {params.value}
          </Typography>
        ),
      },
      {
        field: 'userId',
        headerName: 'User',
        width: 150,
        renderCell: (params) => (
          <Stack direction="row" spacing={1} alignItems="center">
            <EmojiAvatar emoji="👤" size="sm" />
            <Typography level="body-xs">User #{params.value}</Typography>
          </Stack>
        ),
      },
      {
        field: 'ipAddress',
        headerName: 'IP Address',
        width: 150,
        renderCell: (params) => (
          <Typography level="body-xs" color="neutral">
            {params.value}
          </Typography>
        ),
      },
      {
        field: 'createdAt',
        headerName: 'Timestamp',
        width: 200,
        valueGetter: (params) => new Date(params).toLocaleString(),
      },
    ],
    []
  );

  return (
    <ModuleContainer>
      <Box sx={{ mb: 2 }}>
        <Typography level="h2" startDecorator={<Security />}>
          Security & Audit Log
        </Typography>
        <Typography level="body-sm" color="neutral">
          Immutable trail of all sensitive operations within this household.
        </Typography>
      </Box>

      <Card variant="soft" sx={{ p: 0, overflow: 'hidden' }}>
        <AppTable rows={logs} columns={columns} loading={isLoading} getRowId={(row) => row.id} />
      </Card>
    </ModuleContainer>
  );
}
