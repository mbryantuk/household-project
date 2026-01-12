import { useEffect, useState, useCallback } from 'react';
import { Outlet, useParams, useNavigate } from 'react-router-dom';
import { Box } from '@mui/joy';
import NavSidebar from '../components/NavSidebar';
import UtilityBar from '../components/UtilityBar';

export default function HouseholdLayout({ 
  households, 
  onSelectHousehold,
  api,
  onUpdateHousehold,
  members,
  fetchHhMembers,
  user,
  isDark,
  showNotification,
  confirmAction,
  
  dates,
  onDateAdded,
  onUpdateProfile,
  onLogout,
  onSwitchHousehold, 
  currentMode,
  onModeChange,
  installPrompt,
  onInstall,
  useDracula,
  onDraculaChange
}) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [activeHousehold, setActiveHousehold] = useState(null);

  const fetchVehicles = useCallback(async () => {
    try {
      const res = await api.get(`/households/${id}/vehicles`);
      setVehicles(res.data || []);
    } catch (err) {
      console.error("Failed to fetch vehicles for sidebar", err);
    }
  }, [api, id]);

  useEffect(() => {
    const targetHousehold = (households || []).find(h => h && h.id === parseInt(id));
    
    if (targetHousehold) {
      onSelectHousehold(targetHousehold);
      setActiveHousehold(targetHousehold);
      fetchVehicles();
    } else if (households && households.length > 0) {
      navigate('/');
    }
  }, [id, households, onSelectHousehold, navigate, fetchVehicles]);

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        <NavSidebar 
            members={members} 
            vehicles={vehicles}
            isDark={isDark}
            household={activeHousehold}
            user={user}
            onLogout={onLogout}
            onUpdateProfile={onUpdateProfile}
            onModeChange={onModeChange}
            onInstall={onInstall}
            canInstall={!!installPrompt}
        />
        
        <Box component="main" sx={{ flexGrow: 1, p: { xs: 1, sm: 2, md: 3 }, pt: 1, overflowY: 'auto', minWidth: 0, pb: 8 }}>
            <Outlet context={{ 
                api, 
                id, 
                onUpdateHousehold,
                members, 
                fetchHhMembers, 
                fetchVehicles,
                user, 
                isDark,
                showNotification,
                confirmAction
            }} />
        </Box>
      </Box>

      {/* Persistent Bottom Utility Bar */}
      <UtilityBar 
        user={user}
        api={api}
        dates={dates}
        onDateAdded={onDateAdded}
        onUpdateProfile={onUpdateProfile}
        isDark={isDark}
        canInstall={!!installPrompt}
        onInstall={onInstall}
      />
    </Box>
  );
}