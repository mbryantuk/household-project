import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Box, Typography, Sheet, Table, Chip, IconButton, Input } from '@mui/joy';
import { Search, Clear, Warning, Info, CalendarMonth } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import ModuleHeader from '../components/ui/ModuleHeader';
import { getRelativeTime } from '../utils/date';

/**
 * NOTIFICATION HISTORY VIEW
 * Item 242: Central log of all alerts
 */
export default function NotificationHistoryView() {
  const { api, household, isDark } = useOutletContext();
  const householdId = household?.id;
  const [filterQuery, setFilterQuery] = useState('');

  // 1. Fetch All Notifications (including read ones)
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['households', householdId, 'notification-history'],
    queryFn: () =>
      api.get(`/households/${householdId}/notifications/all`).then((res) => res.data || []),
    enabled: !!householdId,
  });

  const filtered = notifications.filter(
    (n) =>
      n.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
      n.message.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const getIcon = (type) => {
    if (type === 'urgent') return <Warning color="danger" />;
    if (type === 'upcoming') return <CalendarMonth color="warning" />;
    return <Info color="primary" />;
  };

  return (
    <Box sx={{ width: '100%' }}>
      <ModuleHeader
        title="Notification History"
        description="Review all past alerts and household activity."
        emoji="🔔"
        isDark={isDark}
        action={
          <Input
            placeholder="Search alerts..."
            startDecorator={<Search />}
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            endDecorator={
              filterQuery && (
                <IconButton size="sm" variant="plain" onClick={() => setFilterQuery('')}>
                  <Clear />
                </IconButton>
              )
            }
            sx={{ width: 250 }}
          />
        }
      />

      <Sheet variant="outlined" sx={{ borderRadius: 'md', overflow: 'hidden', mt: 3 }}>
        <Table hoverRow stickyHeader>
          <thead>
            <tr>
              <th style={{ width: 50 }}></th>
              <th style={{ width: 150 }}>Date</th>
              <th>Message</th>
              <th style={{ width: 100 }}>Type</th>
              <th style={{ width: 100 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((n) => (
              <tr key={n.id}>
                <td>{getIcon(n.type)}</td>
                <td>
                  <Typography level="body-xs">
                    {new Date(n.created_at).toLocaleDateString()}
                    <br />
                    {getRelativeTime(new Date(n.created_at))}
                  </Typography>
                </td>
                <td>
                  <Typography level="title-sm">{n.title}</Typography>
                  <Typography level="body-xs">{n.message}</Typography>
                </td>
                <td>
                  <Chip size="sm" variant="soft" color={n.type === 'urgent' ? 'danger' : 'neutral'}>
                    {n.type || 'info'}
                  </Chip>
                </td>
                <td>
                  {n.is_read ? (
                    <Chip size="sm" variant="plain" color="neutral">
                      Read
                    </Chip>
                  ) : (
                    <Chip size="sm" variant="soft" color="primary">
                      Unread
                    </Chip>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && !isLoading && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}>
                  <Typography level="body-sm" color="neutral">
                    No history found.
                  </Typography>
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </Sheet>
    </Box>
  );
}
