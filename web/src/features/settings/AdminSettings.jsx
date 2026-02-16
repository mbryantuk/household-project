import { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Typography, Sheet, Tabs, TabList, Tab, TabPanel, Stack, Button, Grid, Chip, Divider, IconButton, Tooltip } from '@mui/joy';
import HealthAndSafety from '@mui/icons-material/HealthAndSafety';
import Update from '@mui/icons-material/Update';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Cancel from '@mui/icons-material/Cancel';
import Info from '@mui/icons-material/Info';
import Verified from '@mui/icons-material/Verified';
import Policy from '@mui/icons-material/Policy';
import DeleteForever from '@mui/icons-material/DeleteForever';
import Home from '@mui/icons-material/Home';
import CloudDownload from '@mui/icons-material/CloudDownload';
import DataObject from '@mui/icons-material/DataObject';

import { useHousehold } from '../../contexts/HouseholdContext';
import { APP_NAME, APP_VERSION } from '../../constants';
import AppSelect from '../../components/ui/AppSelect';
import pkg from '../../../package.json';
import gitInfo from '../../git-info.json';

export default function AdminSettings() {
  const { api, showNotification, household, onUpdateHousehold } = useHousehold();
  const [activeTab, setActiveTab] = useState(0);

  // Tenants State
  const [tenants, setTenants] = useState([]);
  const [loadingTenants, setLoadingTenants] = useState(false);

  // Nightly Health State
  const [testResults, setTestResults] = useState([]);
  const [loadingTests, setLoadingTests] = useState(false);
  const [nightlyVersionFilter, setNightlyVersionFilter] = useState(household?.nightly_version_filter || '');

  // Version History State
  const [versionHistory, setVersionHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Health Check State
  const [healthOptions] = useState({
    skipDocker: true,
    skipBackend: false,
    skipFrontend: false,
    skipPurge: true
  });

  const availableVersions = useMemo(() => {
    const versions = new Set(testResults.map(r => r.version).filter(Boolean));
    versions.add(pkg.version);
    return Array.from(versions).sort((a, b) => b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' }));
  }, [testResults]);

  const fetchTenants = useCallback(async () => {
    setLoadingTenants(true);
    try {
      const res = await api.get('/admin/all-households');
      setTenants(res.data);
    } catch {
      showNotification("Failed to fetch tenants.", "danger");
    } finally {
      setLoadingTenants(false);
    }
  }, [api, showNotification]);

  const fetchTestResults = useCallback(async () => {
    setLoadingTests(true);
    try {
      const res = await api.get('/admin/test-results');
      setTestResults(res.data);
    } catch {
      showNotification("Failed to fetch test results.", "danger");
    } finally {
      setLoadingTests(false);
    }
  }, [api, showNotification]);

  const fetchVersionHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await api.get('/admin/version-history');
      setVersionHistory(res.data);
    } catch {
      showNotification("Failed to fetch version history.", "danger");
    } finally {
      setLoadingHistory(false);
    }
  }, [api, showNotification]);

  const onExportTenant = async (tenant) => {
    try {
        showNotification(`Preparing export for "${tenant.name}"...`, "neutral");
        const res = await api.get(`/admin/households/${tenant.id}/export`);
        const filename = res.data.filename;
        
        // Use axios to download with Auth header
        const downloadRes = await api.get(`/admin/backups/download/${filename}`, {
            responseType: 'blob'
        });
        
        const url = window.URL.createObjectURL(new Blob([downloadRes.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        
        showNotification(`Tenant "${tenant.name}" exported successfully.`, "success");
    } catch (err) {
        showNotification(err.response?.data?.error || "Failed to export tenant.", "danger");
    }
  };

  const onExportJSONTenant = async (tenant) => {
    try {
        showNotification(`Generating JSON export for "${tenant.name}"...`, "neutral");
        const res = await api.get(`/export/${tenant.id}`, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        const timestamp = new Date().toISOString().split('T')[0];
        link.setAttribute('download', `hearth-export-hh${tenant.id}-${timestamp}.json`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        showNotification(`Tenant "${tenant.name}" exported as JSON.`, "success");
    } catch (err) {
        showNotification(err.response?.data?.error || "Failed to export JSON.", "danger");
    }
  };

  const triggerHealthCheck = async () => {
    try {
      await api.post('/admin/health-check/trigger', healthOptions);
      showNotification("Health check started.", "success");
    } catch (err) {
      showNotification(err.response?.data?.error || "Failed to start health check.", "danger");
    }
  };

  const onDestroyTenant = async (tenant) => {
    if (tenant.id === household.id) {
        showNotification("You cannot destroy the household you are currently using.", "warning");
        return;
    }

    const confirmed = window.confirm(`⚠️ DANGER: Are you sure you want to destroy tenant "${tenant.name}" (ID: ${tenant.id})?\n\nThis will permanently delete ALL data, backups, and user associations. This cannot be undone.`);
    if (!confirmed) return;

    try {
        await api.delete(`/households/${tenant.id}`);
        showNotification(`Tenant "${tenant.name}" destroyed successfully.`, "success");
        fetchTenants();
    } catch (err) {
        showNotification(err.response?.data?.error || "Failed to destroy tenant.", "danger");
    }
  };

  useEffect(() => {
    if (activeTab === 0) fetchTenants();
    if (activeTab === 1) fetchTestResults();
    if (activeTab === 2) fetchVersionHistory();
  }, [activeTab, fetchTenants, fetchTestResults, fetchVersionHistory]);

  return (
    <Stack spacing={4}>
      <Box>
        <Typography level="h4">System Administration</Typography>
        <Typography level="body-sm">Monitor platform health and manage tenants</Typography>
      </Box>

      <Tabs value={activeTab} onChange={(_e, v) => setActiveTab(v)}>
        <TabList variant="plain" sx={{ mb: 2 }}>
          <Tab value={0}>Tenants</Tab>
          <Tab value={1}>Nightly Health</Tab>
          <Tab value={2}>Release Notes</Tab>
          <Tab value={3}>About</Tab>
        </TabList>

        <TabPanel value={0}>
            <Stack spacing={3}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography level="title-md">Tenant Registry</Typography>
                    <Button variant="soft" color="primary" startDecorator={<Update />} onClick={fetchTenants} loading={loadingTenants}>Refresh</Button>
                </Box>

                <Sheet variant="outlined" sx={{ borderRadius: 'md', overflow: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: 'var(--joy-palette-background-level1)' }}>
                                <th style={{ padding: '12px' }}>Household</th>
                                <th style={{ padding: '12px' }}>Created</th>
                                <th style={{ padding: '12px' }}>Type</th>
                                <th style={{ padding: '12px' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tenants.map(t => (
                                <tr key={t.id}>
                                    <td style={{ padding: '12px', borderBottom: '1px solid var(--joy-palette-divider)' }}>
                                        <Stack direction="row" spacing={1.5} alignItems="center">
                                            <Box sx={{ p: 0.5, borderRadius: 'sm', bgcolor: 'background.level2' }}>
                                                <Home sx={{ color: 'primary.plainColor' }} />
                                            </Box>
                                            <Box>
                                                <Typography level="body-sm" fontWeight="bold">{t.name}</Typography>
                                                <Typography level="body-xs">ID: #{t.id}</Typography>
                                            </Box>
                                        </Stack>
                                    </td>
                                    <td style={{ padding: '12px', borderBottom: '1px solid var(--joy-palette-divider)' }}>
                                        <Typography level="body-xs">{new Date(t.created_at).toLocaleDateString()}</Typography>
                                    </td>
                                    <td style={{ padding: '12px', borderBottom: '1px solid var(--joy-palette-divider)' }}>
                                        <Chip size="sm" variant="soft" color={t.is_test ? "warning" : "success"}>
                                            {t.is_test ? "Test" : "Production"}
                                        </Chip>
                                    </td>
                                    <td style={{ padding: '12px', borderBottom: '1px solid var(--joy-palette-divider)' }}>
                                        <Stack direction="row" spacing={0.5}>
                                            <Tooltip title="Export (ZIP)" variant="soft" color="primary">
                                                <IconButton 
                                                    size="sm" 
                                                    variant="plain" 
                                                    color="primary" 
                                                    aria-label="Export (ZIP)"
                                                    onClick={() => onExportTenant(t)}
                                                >
                                                    <CloudDownload />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Export (JSON)" variant="soft" color="primary">
                                                <IconButton 
                                                    size="sm" 
                                                    variant="plain" 
                                                    color="primary" 
                                                    aria-label="Export (JSON)"
                                                    onClick={() => onExportJSONTenant(t)}
                                                >
                                                    <DataObject />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Destroy Tenant" variant="soft" color="danger">
                                                <IconButton 
                                                    size="sm" 
                                                    variant="plain" 
                                                    color="danger" 
                                                    aria-label="Destroy Tenant"
                                                    disabled={t.id === household.id}
                                                    onClick={() => onDestroyTenant(t)}
                                                >
                                                    <DeleteForever />
                                                </IconButton>
                                            </Tooltip>
                                        </Stack>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Sheet>
            </Stack>
        </TabPanel>

        <TabPanel value={1}>
            <Stack spacing={3}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography level="title-md">Health Monitor</Typography>
                    <Stack direction="row" spacing={1}>
                        <Button variant="soft" color="success" startDecorator={<HealthAndSafety />} onClick={triggerHealthCheck}>Run Diagnostic</Button>
                        <Button variant="soft" color="primary" startDecorator={<Update />} onClick={fetchTestResults} loading={loadingTests}>Refresh</Button>
                    </Stack>
                </Box>

                <Sheet variant="outlined" sx={{ p: 2, borderRadius: 'md', bgcolor: 'background.level1' }}>
                    <Grid container spacing={2} alignItems="flex-end">
                        <Grid xs={8}>
                            <AppSelect
                                label="Nightly Version Filter"
                                value={nightlyVersionFilter}
                                onChange={(v) => setNightlyVersionFilter(v)}
                                options={[
                                    { value: '', label: 'All Versions' },
                                    ...availableVersions.map(v => ({ value: v, label: `v${v}` }))
                                ]}
                            />
                        </Grid>
                        <Grid xs={4}>
                            <Button fullWidth onClick={() => onUpdateHousehold({ nightly_version_filter: nightlyVersionFilter })}>Save</Button>
                        </Grid>
                    </Grid>
                </Sheet>

                <Sheet variant="outlined" sx={{ borderRadius: 'md', overflow: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: 'var(--joy-palette-background-level1)' }}>
                                <th style={{ padding: '12px' }}>Date</th>
                                <th style={{ padding: '12px' }}>Suite</th>
                                <th style={{ padding: '12px' }}>Version</th>
                                <th style={{ padding: '12px' }}>Breakdown</th>
                                <th style={{ padding: '12px' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {testResults.filter(r => !nightlyVersionFilter || r.version === nightlyVersionFilter).map(r => (
                                <tr key={r.id}>
                                    <td style={{ padding: '12px', borderBottom: '1px solid var(--joy-palette-divider)' }}>
                                        <Typography level="body-xs">{new Date(r.created_at).toLocaleString()}</Typography>
                                    </td>
                                    <td style={{ padding: '12px', borderBottom: '1px solid var(--joy-palette-divider)' }}>
                                        <Typography level="body-sm" sx={{ fontWeight: 'bold' }}>{r.suite_name}</Typography>
                                    </td>
                                    <td style={{ padding: '12px', borderBottom: '1px solid var(--joy-palette-divider)' }}>
                                        <Typography level="body-xs">v{r.version}</Typography>
                                    </td>
                                    <td style={{ padding: '12px', borderBottom: '1px solid var(--joy-palette-divider)' }}>
                                        <Typography level="body-sm">{r.passes} / {r.total}</Typography>
                                    </td>
                                    <td style={{ padding: '12px', borderBottom: '1px solid var(--joy-palette-divider)' }}>
                                        <Chip size="sm" color={r.fails === 0 ? "success" : "danger"}>{r.fails === 0 ? "Passed" : "Failed"}</Chip>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Sheet>
            </Stack>
        </TabPanel>

        <TabPanel value={2}>
            <Stack spacing={3}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography level="title-md">Release Notes</Typography>
                    <Button variant="soft" color="primary" startDecorator={<Update />} onClick={fetchVersionHistory} loading={loadingHistory}>Refresh</Button>
                </Box>
                <Sheet variant="outlined" sx={{ borderRadius: 'md', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: 'var(--joy-palette-background-level1)' }}>
                            <th style={{ padding: '12px', textAlign: 'left' }}>Date</th>
                            <th style={{ padding: '12px', textAlign: 'left' }}>Version</th>
                            <th style={{ padding: '12px', textAlign: 'left' }}>Notes</th>
                        </tr>
                    </thead>
                    <tbody>
                        {versionHistory.map(v => (
                            <tr key={v.id}>
                                <td style={{ padding: '12px', borderBottom: '1px solid var(--joy-palette-divider)' }}>
                                    <Typography level="body-xs">{new Date(v.created_at).toLocaleDateString()}</Typography>
                                </td>
                                <td style={{ padding: '12px', borderBottom: '1px solid var(--joy-palette-divider)' }}>
                                    <Chip size="sm" variant="soft" color="primary">v{v.version}</Chip>
                                </td>
                                <td style={{ padding: '12px', borderBottom: '1px solid var(--joy-palette-divider)' }}>
                                    <Typography level="body-sm">{v.comment}</Typography>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Sheet>
            </Stack>
        </TabPanel>

        <TabPanel value={3}>
            <Grid container spacing={3}>
                <Grid xs={12} md={7}>
                    <Stack spacing={3}>
          <Box sx={{ flex: 1 }}>
              <Typography level="title-lg" startDecorator={<Verified color="primary" />}>{APP_NAME} Household OS</Typography>
              <Typography level="body-sm" color="neutral" sx={{ mb: 2 }}>Build {new Date().toISOString().split('T')[0].replace(/-/g, '.')} (Production Stone)</Typography>
              
              <Typography level="body-md" sx={{ mb: 2, lineHeight: 1.6 }}>
                  {APP_NAME.toUpperCase()} ({APP_NAME}) is a next-generation household management engine designed for absolute data privacy and multi-tenant isolation.
              </Typography>
              
              <Sheet variant="soft" color="neutral" sx={{ p: 2, borderRadius: 'md', mb: 3 }}>
                  <Typography level="body-xs" component="div" sx={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 1 }}>
                      <b>Core Engine:</b> V{APP_VERSION}-STABLE
                      <b>Architecture:</b> Monolithic Stone
                      <b>Database:</b> SQLite (Optimized for {APP_NAME} V4 Architecture)
                  </Typography>
              </Sheet>
          </Box>

                        <Divider />

                        <Box>
                            <Typography level="title-sm" sx={{ mb: 1 }}>Credits & Contributions</Typography>
                            <Typography level="body-xs" sx={{ lineHeight: 1.6 }}>
                                <b>Lead Architect:</b> Matt Bryant<br />
                                <b>Framework:</b> MUI Joy UI & React<br />
                                <b>Core Icons:</b> Google Material Symbols<br />
                                <b>Database:</b> SQLite (Optimized for {APP_NAME} V4 Architecture)
                            </Typography>
                        </Box>

                        <Box>
                            <Typography level="title-sm" startDecorator={<Policy color="warning" />} sx={{ mb: 1 }}>Licensing</Typography>
                            <Typography level="body-xs" sx={{ lineHeight: 1.6 }}>
                                This software is released under the <b>GNU General Public License v3.0 (GPL-3.0)</b>. 
                                In accordance with GPL requirements:
                                <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                                    <li>The full source code for this instance must be made available to users.</li>
                                    <li>Modified versions must carry prominent notices stating that you changed the files.</li>
                                    <li>Any work based on this software must also be licensed under GPL-3.0.</li>
                                </ul>
                            </Typography>
                        </Box>

                        <Divider />
                        
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Box>
                                <Typography level="body-xs" fontWeight="bold">Current Version</Typography>
                                <Typography level="body-sm">v{pkg.version}</Typography>
                            </Box>
                            <Box>
                                <Typography level="body-xs" fontWeight="bold">Build Signature</Typography>
                                <Typography level="body-sm" sx={{ fontFamily: 'monospace', opacity: 0.7 }}>{gitInfo.commitHash?.substring(0, 7) || 'DEV'}</Typography>
                            </Box>
                        </Stack>
                    </Stack>
                </Grid>
            </Grid>
        </TabPanel>
      </Tabs>
    </Stack>
  );
}