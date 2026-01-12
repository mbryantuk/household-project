import { useEffect, useState, useCallback } from 'react';
import { Outlet, useParams, useNavigate } from 'react-router-dom';
import { Box } from '@mui/joy';
import NavSidebar from '../components/NavSidebar';
import FloatingCalendar from '../components/FloatingCalendar';
import FloatingCalculator from '../components/FloatingCalculator';
import PostItNote from '../components/PostItNote';

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
  
  // Props moved from TopBar
  dates,
  onDateAdded,
  onUpdateProfile,
  onLogout,
  onSwitchHousehold, // Not used here directly, handled by sidebar? 
  currentMode,
  onModeChange,
  installPrompt,
  onInstall
}) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [activeHousehold, setActiveHousehold] = useState(null);

  // Widget States
  const [showCalendar, setShowCalendar] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  const [showNote, setShowNote] = useState(false);

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
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <NavSidebar 
        // Data
        members={members} 
        vehicles={vehicles}
        isDark={isDark}
        household={activeHousehold}
        user={user}
        
        // Actions
        onLogout={onLogout}
        onUpdateProfile={onUpdateProfile}
        onModeChange={onModeChange}
        onInstall={onInstall}
        canInstall={!!installPrompt}
        
        // Widget Toggles
        toggleCalendar={() => setShowCalendar(!showCalendar)}
        toggleCalc={() => setShowCalc(!showCalc)}
        toggleNote={() => setShowNote(!showNote)}
      />
      
      <Box component="main" sx={{ flexGrow: 1, p: { xs: 1, sm: 2, md: 3 }, pt: 1, overflowY: 'auto', minWidth: 0 }}>
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

      {/* Floating Widgets Rendered Here */}
      {showCalendar && (
          <FloatingCalendar 
            dates={dates} 
            api={api} 
            householdId={activeHousehold?.id}
            currentUser={user}
            onDateAdded={onDateAdded} 
            onClose={() => setShowCalendar(false)}
            isDark={isDark}
          />
        )}

      {showCalc && <FloatingCalculator onClose={() => setShowCalc(false)} isDark={isDark} />}

      {showNote && <PostItNote onClose={() => setShowNote(false)} user={user} onUpdateProfile={onUpdateProfile} />}
    </Box>
  );
}
