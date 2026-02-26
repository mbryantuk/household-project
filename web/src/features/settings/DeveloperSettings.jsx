import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Sheet,
  Table,
  IconButton,
  Input,
  Stack,
  Chip,
  Divider,
  Alert,
  Tooltip,
} from '@mui/joy';
import {
  Delete,
  ContentCopy,
  OpenInNew,
  Add,
  VpnKey,
  Webhook,
  CheckCircle,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useHousehold } from '../../context/HouseholdContext';
import { useUI } from '../../context/UIContext';

/**
 * DEVELOPER SETTINGS
 * Item 237: API Key Management
 * Item 238: Webhook Configuration
 */
export default function DeveloperSettings() {
  const { api, householdId } = useHousehold();
  const { showNotification } = useUI();
  const queryClient = useQueryClient();

  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState(null);
  const [webhookUrl, setWebhookUrl] = useState('');

  // 1. Queries
  const { data: apiKeys = [] } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => api.get('/auth/api-keys').then((res) => res.data || []),
  });

  const { data: webhooks = [] } = useQuery({
    queryKey: ['households', householdId, 'webhooks'],
    queryFn: () => api.get(`/households/${householdId}/webhooks`).then((res) => res.data || []),
    enabled: !!householdId,
  });

  // 2. Mutations
  const createKeyMutation = useMutation({
    mutationFn: (name) => api.post('/auth/api-keys', { name, householdId }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      setGeneratedKey(res.data.apiKey);
      setNewKeyName('');
      showNotification('API Key generated', 'success');
    },
  });

  const deleteKeyMutation = useMutation({
    mutationFn: (id) => api.delete(`/auth/api-keys/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      showNotification('API Key revoked', 'success');
    },
  });

  const createWebhookMutation = useMutation({
    mutationFn: (url) => api.post(`/households/${householdId}/webhooks`, { url }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['households', householdId, 'webhooks'] });
      setWebhookUrl('');
      showNotification('Webhook registered', 'success');
    },
  });

  const deleteWebhookMutation = useMutation({
    mutationFn: (id) => api.delete(`/households/${householdId}/webhooks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['households', householdId, 'webhooks'] });
      showNotification('Webhook deleted', 'success');
    },
  });

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showNotification('Copied to clipboard', 'success');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* API Documentation Section */}
      <Box>
        <Typography level="h4" sx={{ mb: 1 }}>
          Documentation
        </Typography>
        <Typography level="body-sm" sx={{ mb: 2 }}>
          Explore the Hearth Household SaaS API documentation.
        </Typography>
        <Sheet
          variant="outlined"
          sx={{
            p: 2,
            borderRadius: 'md',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box>
            <Typography level="title-md">Swagger UI</Typography>
            <Typography level="body-xs" color="neutral">
              Interactive API documentation (OpenAPI 3.0)
            </Typography>
          </Box>
          <Button
            size="sm"
            component="a"
            href="/api-docs"
            target="_blank"
            rel="noopener noreferrer"
            endDecorator={<OpenInNew />}
          >
            Open Docs
          </Button>
        </Sheet>
      </Box>

      <Divider />

      {/* API Keys Section */}
      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Box>
            <Typography level="h4">API Keys</Typography>
            <Typography level="body-sm">
              Manage keys for external integrations. Keep these secret.
            </Typography>
          </Box>
        </Stack>

        {generatedKey && (
          <Alert
            color="success"
            variant="soft"
            startDecorator={<CheckCircle />}
            endDecorator={
              <Button size="sm" variant="plain" onClick={() => setGeneratedKey(null)}>
                Dismiss
              </Button>
            }
            sx={{ mb: 2 }}
          >
            <Box sx={{ width: '100%' }}>
              <Typography level="title-sm">New API Key Generated</Typography>
              <Typography level="body-xs" sx={{ mt: 0.5, mb: 1 }}>
                Copy this key now. For your security, it will not be shown again.
              </Typography>
              <Stack direction="row" spacing={1}>
                <Input
                  size="sm"
                  readOnly
                  value={generatedKey}
                  sx={{ flexGrow: 1, fontFamily: 'monospace' }}
                  endDecorator={
                    <IconButton size="sm" onClick={() => copyToClipboard(generatedKey)}>
                      <ContentCopy />
                    </IconButton>
                  }
                />
              </Stack>
            </Box>
          </Alert>
        )}

        <Sheet variant="outlined" sx={{ borderRadius: 'md', overflow: 'hidden' }}>
          <Table size="sm">
            <thead>
              <tr>
                <th>Name</th>
                <th>Prefix</th>
                <th>Created</th>
                <th>Last Used</th>
                <th style={{ width: 50 }}></th>
              </tr>
            </thead>
            <tbody>
              {apiKeys.map((key) => (
                <tr key={key.id}>
                  <td>{key.name}</td>
                  <td>
                    <code style={{ fontSize: '0.8rem' }}>{key.prefix}...</code>
                  </td>
                  <td>{new Date(key.createdAt).toLocaleDateString()}</td>
                  <td>{key.lastUsed ? new Date(key.lastUsed).toLocaleDateString() : 'Never'}</td>
                  <td>
                    <IconButton
                      size="sm"
                      variant="plain"
                      color="danger"
                      onClick={() => deleteKeyMutation.mutate(key.id)}
                    >
                      <Delete />
                    </IconButton>
                  </td>
                </tr>
              ))}
              {apiKeys.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>
                    <Typography level="body-sm" color="neutral">
                      No API keys generated yet.
                    </Typography>
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
          <Box
            sx={{
              p: 2,
              bgcolor: 'background.level1',
              borderTop: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Stack direction="row" spacing={1}>
              <Input
                size="sm"
                placeholder="Key Name (e.g. HomeAssistant)"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                sx={{ flexGrow: 1 }}
              />
              <Button
                size="sm"
                startDecorator={<VpnKey />}
                disabled={!newKeyName}
                onClick={() => createKeyMutation.mutate(newKeyName)}
              >
                Generate Key
              </Button>
            </Stack>
          </Box>
        </Sheet>
      </Box>

      <Divider />

      {/* Webhooks Section */}
      <Box>
        <Box sx={{ mb: 2 }}>
          <Typography level="h4">Outgoing Webhooks</Typography>
          <Typography level="body-sm">
            Notify external services when events happen in your household.
          </Typography>
        </Box>

        <Sheet variant="outlined" sx={{ borderRadius: 'md', overflow: 'hidden' }}>
          <Table size="sm">
            <thead>
              <tr>
                <th>Target URL</th>
                <th>Events</th>
                <th style={{ width: 50 }}></th>
              </tr>
            </thead>
            <tbody>
              {webhooks.map((hook) => (
                <tr key={hook.id}>
                  <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {hook.url}
                  </td>
                  <td>
                    <Stack direction="row" spacing={0.5}>
                      {JSON.parse(hook.events || '[]').map((e) => (
                        <Chip key={e} size="sm" variant="soft">
                          {e}
                        </Chip>
                      ))}
                    </Stack>
                  </td>
                  <td>
                    <IconButton
                      size="sm"
                      variant="plain"
                      color="danger"
                      onClick={() => deleteWebhookMutation.mutate(hook.id)}
                    >
                      <Delete />
                    </IconButton>
                  </td>
                </tr>
              ))}
              {webhooks.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: '20px' }}>
                    <Typography level="body-sm" color="neutral">
                      No webhooks configured.
                    </Typography>
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
          <Box
            sx={{
              p: 2,
              bgcolor: 'background.level1',
              borderTop: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Stack direction="row" spacing={1}>
              <Input
                size="sm"
                placeholder="https://hooks.zapier.com/..."
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                sx={{ flexGrow: 1 }}
              />
              <Button
                size="sm"
                variant="outlined"
                startDecorator={<Webhook />}
                disabled={!webhookUrl}
                onClick={() => createWebhookMutation.mutate(webhookUrl)}
              >
                Add Webhook
              </Button>
            </Stack>
          </Box>
        </Sheet>
      </Box>
    </Box>
  );
}
