import React, { useMemo } from 'react';
import { Box, Typography, Chip, Stack, Card, Tooltip } from '@mui/joy';
import { Security, History } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { getRelativeTime } from '../utils/date';
import AppTable from '../components/ui/AppTable';
import ModuleContainer from '../components/ui/ModuleContainer';
import EmojiAvatar from '../components/ui/EmojiAvatar';
import VirtualList from '../components/ui/VirtualList';

/**
 * Security Audit View
 * Displays the immutable audit trail from Postgres.
 * Item 249: Frontend List Virtualization (via AppTable DataGrid for desktop, VirtualList for mobile)
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
        headerName: 'Time',
        width: 200,
        renderCell: (params) => (
          <Tooltip title={new Date(params.value).toLocaleString()} variant="soft">
            <Typography level="body-xs">{getRelativeTime(params.value)}</Typography>
          </Tooltip>
        ),
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

      {/* Desktop View: DataGrid (Virtualized) */}
      <Card variant="soft" sx={{ p: 0, overflow: 'hidden', display: { xs: 'none', md: 'block' } }}>
        <AppTable rows={logs} columns={columns} loading={isLoading} getRowId={(row) => row.id} />
      </Card>

      {/* Mobile View: VirtualList */}
      <Box sx={{ display: { xs: 'block', md: 'none' } }}>
        <VirtualList
          data={logs}
          height={600}
          itemContent={(index, log) => (
            <Card variant="outlined" sx={{ mb: 1, p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Chip variant="soft" color="primary" size="sm" startDecorator={<History />}>
                  {log.action}
                </Chip>
                <Typography level="body-xs">{getRelativeTime(log.createdAt)}</Typography>
              </Stack>
              <Typography level="body-sm" sx={{ mt: 1, textTransform: 'capitalize' }}>
                {log.entityType} (User #{log.userId})
              </Typography>
              <Typography level="body-xs" color="neutral">
                {log.ipAddress}
              </Typography>
            </Card>
          )}
        />
      </Box>
    </ModuleContainer>
  );
}
