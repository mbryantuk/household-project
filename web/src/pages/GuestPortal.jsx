import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  Stack,
  Avatar,
  CircularProgress,
  Alert,
  Divider,
  Button,
} from '@mui/joy';
import { Wifi, Phone, Info, ContentCopy } from '@mui/icons-material';
import axios from 'axios';
import { getEmojiColor } from '../utils/colors';

/**
 * GuestPortal
 * Item 292: Restricted view for house guests.
 */
export default function GuestPortal() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`/api/households/public/guest-details?token=${token}`);
        setData(res.data.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load guest portal');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  if (loading)
    return (
      <Box
        sx={{ display: 'flex', height: '100dvh', alignItems: 'center', justifyContent: 'center' }}
      >
        <CircularProgress size="lg" />
      </Box>
    );

  if (error)
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Alert color="danger" variant="soft">
          {error}
        </Alert>
        <Button variant="plain" sx={{ mt: 2 }} onClick={() => window.location.reload()}>
          Retry
        </Button>
      </Box>
    );

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard');
  };

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: 'auto', pb: 10 }}>
      <Stack spacing={4}>
        <Box sx={{ textAlign: 'center' }}>
          <Avatar size="xl" sx={{ mx: 'auto', mb: 2, bgcolor: getEmojiColor(data.name) }}>
            🏠
          </Avatar>
          <Typography level="h2">Welcome to {data.name}</Typography>
          <Typography level="body-sm" color="neutral">
            Your temporary access to the household details.
          </Typography>
        </Box>

        {/* WiFi Details */}
        <Card variant="soft" color="primary">
          <Typography level="title-lg" startDecorator={<Wifi />}>
            WiFi Access
          </Typography>
          <Divider sx={{ my: 1.5 }} />
          <Stack spacing={2}>
            <Box>
              <Typography level="body-xs" fontWeight="bold">
                SSID (Network Name)
              </Typography>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography level="title-md">{data.wifi.ssid}</Typography>
                <IconButton size="sm" onClick={() => copyToClipboard(data.wifi.ssid)}>
                  <ContentCopy sx={{ fontSize: '1rem' }} />
                </IconButton>
              </Stack>
            </Box>
            <Box>
              <Typography level="body-xs" fontWeight="bold">
                Password
              </Typography>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography level="title-md" sx={{ fontFamily: 'monospace' }}>
                  {data.wifi.password}
                </Typography>
                <IconButton size="sm" onClick={() => copyToClipboard(data.wifi.password)}>
                  <ContentCopy sx={{ fontSize: '1rem' }} />
                </IconButton>
              </Stack>
            </Box>
          </Stack>
        </Card>

        {/* Emergency Contacts */}
        {data.emergency_contacts && (
          <Card variant="outlined">
            <Typography level="title-md" startDecorator={<Phone />}>
              Emergency Contacts
            </Typography>
            <Typography level="body-sm" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
              {data.emergency_contacts}
            </Typography>
          </Card>
        )}

        {/* House Notes */}
        {data.notes && (
          <Card variant="outlined">
            <Typography level="title-md" startDecorator={<Info />}>
              House Rules & Info
            </Typography>
            <Typography level="body-sm" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
              {data.notes}
            </Typography>
          </Card>
        )}

        <Typography level="body-xs" textAlign="center" color="neutral">
          Hearthstone guest access expires automatically. Enjoy your stay!
        </Typography>
      </Stack>
    </Box>
  );
}

import { IconButton } from '@mui/joy';
