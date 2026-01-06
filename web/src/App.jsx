import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Box, CssBaseline, ThemeProvider, useMediaQuery, TextField, Button, Card, Typography } from '@mui/material';

// Theme and Local Components
import { getTotemTheme } from './theme';
import TopBar from './components/TopBar';
import NavSidebar from './components/NavSidebar';
import HouseholdView from './pages/HouseholdView';
import SetupWizard from './pages/SetupWizard';
import TotemIcon from './components/TotemIcon';

const API_URL = window.location.origin;

export default function App() {
  // --- SYSTEM & THEME STATE ---
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [modeOverride, setModeOverride] = useState(localStorage.getItem('themeMode') || 'system');
  const [installPrompt, setInstallPrompt] = useState(null);
  
  // --- AUTH STATE ---
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(true);

  // --- NAVIGATION STATE ---
  const [viewMode, setViewMode] = useState('login'); 
  const [currentFeature, setCurrentFeature] = useState('home'); 
  const [drawerOpen, setDrawerOpen] = useState(false);

  // --- DATA STATE ---
  const [households, setHouseholds] = useState([]);
  const [currentHousehold, setCurrentHousehold] = useState(null);
  const [hhUsers, setHhUsers] = useState([]);     
  const [hhMembers, setHhMembers] = useState([]); 

  // --- AXIOS CONFIG ---
  const authAxios = useMemo(() => axios.create({ 
    baseURL: API_URL, 
    headers: { Authorization: `Bearer ${token}` } 
  }), [token]);

  // --- THEME ENGINE ---
  const theme = useMemo(() => {
    const currentMode = modeOverride === 'system' ? (prefersDarkMode ? 'dark' : 'light') : modeOverride;
    // Theme now pulls from currentHousehold.theme, which is restored by the fixed fetch
    return getTotemTheme(currentHousehold?.theme || 'default', currentMode);
  }, [currentHousehold?.theme, modeOverride, prefersDarkMode]);

  // --- APP INITIALIZATION ---
  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); setInstallPrompt(e); });

    axios.get(`${API_URL}/system/status`)
      .then(res => {
        if (res.data.needsSetup) { setNeedsSetup(true); } 
        else if (token) { fetchHouseholds(); }
      })
      .catch(err => console.error("API Connectivity Error:", err))
      .finally(() => setLoading(false));
  }, [token]);

  // --- DATA FETCHING (Using Flat Routes) ---
  const fetchHouseholds = async () => {
    try {
      const res = await authAxios.get('/my-households');
      if (Array.isArray(res.data)) {
        setHouseholds(res.data);
        if (res.data.length === 1 && viewMode === 'login') selectHousehold(res.data[0]);
        else if (viewMode === 'login') setViewMode('dashboard');
      }
    } catch (err) {
      if (err.response?.status === 401) logout();
      setViewMode('login');
    }
  };

  const selectHousehold = (hh) => { 
    setCurrentHousehold(hh); 
    setViewMode('household'); 
    fetchHhUsers(hh.id); 
    fetchHhMembers(hh.id); 
  };

  const fetchHhMembers = (hhId) => {
    authAxios.get(`/households/${hhId}/members`)
      .then(res => setHhMembers(Array.isArray(res.data) ? res.data : []));
  };

  const fetchHhUsers = (hhId) => {
    authAxios.get(`/households/${hhId}/users`)
      .then(res => setHhUsers(Array.isArray(res.data) ? res.data : []));
  };

  // --- CORE ACTIONS ---
  const login = async (u, p) => {
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { username: u, password: p });
      const userData = { username: u, role: res.data.system_role };
      setToken(res.data.token); 
      setUser(userData);
      localStorage.setItem('token', res.data.token); 
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (err) { alert("Login failed. Check credentials."); }
  };
const handleDeleteHousehold = async (hhId) => {
    if (!window.confirm("Are you sure? This will permanently delete all members and data for this household.")) {
        return;
    }

    try {
        await authAxios.delete(`/households/${hhId}`);
        setCurrentHousehold(null);
        setViewMode('dashboard');
        fetchHouseholds(); // Refresh the list
    } catch (err) {
        alert("Failed to delete household: " + (err.response?.data?.error || err.message));
    }
};
  const logout = () => {
    localStorage.clear(); setToken(null); setUser(null);
    setViewMode('login'); setCurrentHousehold(null);
  };

  const handleCreateHousehold = async (name) => {
    try {
      await authAxios.post('/households', { name });
      await fetchHouseholds();
    } catch (err) { alert("Failed to create household."); }
  };

  const handleUpdateHousehold = (updates) => {
    authAxios.put(`/households/${currentHousehold.id}`, updates).then(() => {
        setHouseholds(prev => prev.map(h => h.id === currentHousehold.id ? { ...h, ...updates } : h));
        setCurrentHousehold(prev => ({ ...prev, ...updates }));
    });
  };

  const handleCreateUser = async (userData) => {
    try {
      await authAxios.post('/auth/register', userData);
      if (currentHousehold) {
        await authAxios.post(`/households/${currentHousehold.id}/users`, { 
          username: userData.username, 
          role: userData.role || 'member' 
        });
        fetchHhUsers(currentHousehold.id);
      }
      alert("User created.");
    } catch (err) { alert("Error: " + err.message); }
  };

  if (loading) return null;
  if (needsSetup) return <SetupWizard onComplete={() => setNeedsSetup(false)} />;
  if (!token) return <LoginScreen onLogin={login} />;

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: 'flex', bgcolor: 'background.default', minHeight: '100vh' }}>
        <CssBaseline />
        <TopBar 
          user={user} currentHousehold={currentHousehold} households={households} 
          onSwitchHousehold={selectHousehold} onLogout={logout} 
          onGoHome={() => {setCurrentHousehold(null); setViewMode('dashboard');}} 
          toggleSidebar={() => setDrawerOpen(!drawerOpen)}
          currentMode={modeOverride} onModeChange={(m) => { setModeOverride(m); localStorage.setItem('themeMode', m); }}
          canInstall={!!installPrompt} onInstall={() => installPrompt.prompt()}
        />

        {viewMode === 'household' && (
          <NavSidebar open={drawerOpen} toggleDrawer={() => setDrawerOpen(!drawerOpen)} currentView={currentFeature} setView={setCurrentFeature} />
        )}

        <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
          <HouseholdView 
              view={viewMode === 'dashboard' ? 'dashboard' : currentFeature} 
              household={currentHousehold} households={households} currentUser={user}
              users={hhUsers} members={hhMembers} 
              onSelectHousehold={selectHousehold}
              onCreateHousehold={handleCreateHousehold}
              onUpdateHousehold={handleUpdateHousehold}
              onDeleteHousehold={handleDeleteHousehold}
              onAddMember={(e) => {
                  e.preventDefault(); 
                  const data = Object.fromEntries(new FormData(e.currentTarget));
                  authAxios.post(`/households/${currentHousehold.id}/members`, data).then(() => { 
                    fetchHhMembers(currentHousehold.id); 
                    e.target.reset(); 
                  });
              }}
              onRemoveMember={(id) => authAxios.delete(`/households/${currentHousehold.id}/members/${id}`).then(() => fetchHhMembers(currentHousehold.id))}
              onUpdateMember={(mid, data) => 
  authAxios.put(`/households/${currentHousehold.id}/members/${mid}`, data)
    .then(() => fetchHhMembers(currentHousehold.id))
    .catch(err => alert("Failed to update resident"))
}
              onCreateUser={handleCreateUser}
              onRemoveUser={(userId) => authAxios.delete(`/households/${currentHousehold.id}/users/${userId}`).then(() => fetchHhUsers(currentHousehold.id))}
          />
        </Box>
      </Box>
    </ThemeProvider>
  );
}

function LoginScreen({ onLogin }) {
  const [u, setU] = useState(''); const [p, setP] = useState('');
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
      <Card sx={{ p: 4, width: 350, textAlign: 'center', borderRadius: 4 }}>
        <Box sx={{ mb: 2 }}><TotemIcon colorway="default" sx={{ fontSize: 60 }} /></Box>
        <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 2 }}>TOTEM</Typography>
        <form onSubmit={(e) => { e.preventDefault(); onLogin(u, p); }}>
          <TextField fullWidth label="Username" margin="dense" value={u} onChange={ev=>setU(ev.target.value)} />
          <TextField fullWidth type="password" label="Password" margin="dense" value={p} onChange={ev=>setP(ev.target.value)} />
          <Button fullWidth type="submit" variant="contained" size="large" sx={{ mt: 3 }}>Login</Button>
        </form>
      </Card>
    </Box>
  );
}