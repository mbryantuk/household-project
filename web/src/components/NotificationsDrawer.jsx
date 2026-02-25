import React, { useEffect, useState } from 'react';
import {
  Drawer,
  Sheet,
  Typography,
  Box,
  IconButton,
  List,
  ListItem,
  ListItemContent,
  ListItemDecorator,
  Chip,
  Divider,
  Button,
  Badge,
} from '@mui/joy';
import {
  Close,
  Notifications,
  CheckCircle,
  Warning,
  Info,
  CalendarMonth,
} from '@mui/icons-material';
import { useHousehold } from '../context/HouseholdContext';
import { useNavigate } from 'react-router-dom';

export default function NotificationsDrawer({ open, onClose }) {
  const { api, household } = useHousehold();
  const [notifications, setNotifications] = useState({ urgent: [], upcoming: [], info: [] });
  const navigate = useNavigate();

  useEffect(() => {
    if (open && household?.id) {
      api
        .get(`/households/${household.id}/notifications`)
        .then((res) => setNotifications(res.data))
        .catch(console.error);
    }
  }, [open, household, api]);

  const handleItemClick = (n) => {
    onClose();
    if (n.type === 'chore') navigate(`../chores`);
    if (n.type === 'bill') navigate(`../finance`);
    if (n.type === 'vehicle') navigate(`../vehicles/${n.id}`);
    if (n.type === 'event') navigate(`../calendar`);
  };

  const renderSection = (title, items, color, icon) => {
    if (!items || items.length === 0) return null;
    return (
      <Box sx={{ mb: 2 }}>
        <Typography
          level="title-sm"
          startDecorator={icon}
          color={color}
          sx={{
            mb: 1,
            px: 2,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            fontSize: '0.75rem',
          }}
        >
          {title}
        </Typography>
        <List sx={{ '--ListItem-radius': '8px', px: 1 }}>
          {items.map((n, i) => (
            <ListItem key={i}>
              <ListItemDecorator sx={{ fontSize: '1.5rem' }}>{n.emoji}</ListItemDecorator>
              <ListItemContent sx={{ cursor: 'pointer' }} onClick={() => handleItemClick(n)}>
                <Typography level="title-sm">{n.title}</Typography>
                <Typography level="body-xs">
                  {n.message} • {new Date(n.date).toLocaleDateString()}
                </Typography>
              </ListItemContent>
              {n.amount && (
                <Chip size="sm" variant="soft" color={color}>
                  {n.amount}
                </Chip>
              )}
            </ListItem>
          ))}
        </List>
      </Box>
    );
  };

  const totalCount =
    (notifications.urgent?.length || 0) +
    (notifications.upcoming?.length || 0) +
    (notifications.info?.length || 0);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        content: {
          sx: {
            bgcolor: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(20px)',
            boxShadow: 'lg',
            p: 0,
          },
        },
      }}
    >
      <Sheet
        sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'transparent' }}
      >
        <Box
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography level="title-lg" startDecorator={<Notifications color="primary" />}>
            Notifications
            {totalCount > 0 && (
              <Chip size="sm" color="primary" variant="soft" sx={{ ml: 1 }}>
                {totalCount}
              </Chip>
            )}
          </Typography>
          <IconButton variant="plain" color="neutral" onClick={onClose}>
            <Close />
          </IconButton>
        </Box>

        <Box sx={{ flexGrow: 1, overflowY: 'auto', py: 2 }}>
          {totalCount === 0 ? (
            <Box sx={{ textAlign: 'center', p: 4, opacity: 0.6 }}>
              <CheckCircle sx={{ fontSize: '3rem', mb: 1, color: 'success.plainColor' }} />
              <Typography level="title-md">All Clear</Typography>
              <Typography level="body-sm">You're all caught up!</Typography>
            </Box>
          ) : (
            <>
              {renderSection('Urgent Attention', notifications.urgent, 'danger', <Warning />)}
              {renderSection('Upcoming', notifications.upcoming, 'warning', <CalendarMonth />)}
              {renderSection('Information', notifications.info, 'primary', <Info />)}
            </>
          )}
        </Box>

        <Divider />
        <Box sx={{ p: 2 }}>
          <Button fullWidth variant="soft" color="neutral" onClick={onClose}>
            Dismiss All
          </Button>
        </Box>
      </Sheet>
    </Drawer>
  );
}
