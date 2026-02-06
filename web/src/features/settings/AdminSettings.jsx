import { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Typography, Sheet, Tabs, TabList, Tab, TabPanel, Stack, Button, Grid, Chip, Divider, LinearProgress, Checkbox } from '@mui/joy';
import HealthAndSafety from '@mui/icons-material/HealthAndSafety';
import Update from '@mui/icons-material/Update';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Cancel from '@mui/icons-material/Cancel';
import Info from '@mui/icons-material/Info';
import Verified from '@mui/icons-material/Verified';
import Policy from '@mui/icons-material/Policy';

import { useHousehold } from '../../contexts/HouseholdContext';
import AppSelect from '../../components/ui/AppSelect';
import pkg from '../../../package.json';
import gitInfo from '../../git-info.json';

export default function AdminSettings() {
  const { api, showNotification, household, onUpdateHousehold } = useHousehold();
  const [activeTab, setActiveTab] = useState(0);

  // Nightly Health State
  const [testResults, setTestResults] = useState([]);
  const [loadingTests, setLoadingTests] = useState(false);
  const [nightlyVersionFilter, setNightlyVersionFilter] = useState(household?.nightly_version_filter || '');

  // Version History State
  const [versionHistory, setVersionHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Health Check State
  const [healthStatus, setHealthStatus] = useState(null);
  const [healthOptions, setHealthOptions] = useState({
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

  const triggerHealthCheck = async () => {
    try {
      await api.post('/admin/health-check/trigger', healthOptions);
      showNotification("Health check started.", "success");
    } catch (err) {
      showNotification(err.response?.data?.error || "Failed to start health check.", "danger");
    }
  };

  useEffect(() => {
    if (activeTab === 0) fetchTestResults();
    if (activeTab === 1) fetchVersionHistory();
  }, [activeTab, fetchTestResults, fetchVersionHistory]);

  return (
    <Stack spacing={4}>
      <Box>
        <Typography level="h4">System Administration</Typography>
        <Typography level="body-sm">Monitor platform health and version history</Typography>
      </Box>

      <Tabs value={activeTab} onChange={(_e, v) => setActiveTab(v)}>
        <TabList variant="plain" sx={{ mb: 2 }}>
          <Tab value={0}>Nightly Health</Tab>
          <Tab value={1}>Release Notes</Tab>
          <Tab value={2}>About</Tab>
        </TabList>

        <TabPanel value={0}>
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
                                        <Chip size="sm" color={r.fails === 0 ? "success" : "danger"}>{r.fails === 0 ? "Passed" : "Failed"}</Chip>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Sheet>
            </Stack>
        </TabPanel>

        <TabPanel value={1}>
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
        </TabPanel>

        <TabPanel value={2}>
            <Grid container spacing={3}>
                <Grid xs={12} md={7}>
                    <Stack spacing={3}>
                        <Box>
                            <Typography level="title-lg" startDecorator={<Verified color="primary" />}>Mantel Household OS</Typography>
                            <Typography level="body-sm" sx={{ mt: 1 }}>
                                MANTEL is a next-generation household management engine designed for absolute data privacy and multi-tenant isolation.
                            </Typography>
                        </Box>

                        <Divider />

                        <Box>
                            <Typography level="title-sm" sx={{ mb: 1 }}>Credits & Contributions</Typography>
                            <Typography level="body-xs" sx={{ lineHeight: 1.6 }}>
                                <b>Lead Architect:</b> Matt Bryant<br />
                                <b>Framework:</b> MUI Joy UI & React<br />
                                <b>Core Icons:</b> Google Material Symbols<br />
                                <b>Database:</b> SQLite (Optimized for Mantel V3 Architecture)
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
