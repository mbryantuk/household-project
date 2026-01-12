import { useEffect, useState, useCallback } from 'react';
import { Outlet, useParams, useNavigate } from 'react-router-dom';
import { Box } from '@mui/joy';
import NavSidebar from '../components/NavSidebar';

export default function HouseholdLayout({ 
  drawerOpen, 
  toggleDrawer, 
  households, 
  onSelectHousehold,
  api,
  onUpdateHousehold,
  members,
  fetchHhMembers,
  user,
  isDark,
  showNotification,
  confirmAction
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
    <Box sx={{ display: 'flex' }}>
      <NavSidebar 
        open={drawerOpen} 
        toggleDrawer={toggleDrawer} 
        members={members} 
        vehicles={vehicles}
        isDark={isDark}
        household={activeHousehold}
      />
      <Box component="main" sx={{ flexGrow: 1, width: '100%', p: { xs: 1, sm: 2, md: 3 }, pt: 1 }}>
        {/* We removed fixed AppBar Spacer because TopBar is now sticky or we need padding if fixed.
            If TopBar in RootLayout is sticky, we don't need a spacer here.
            Let's assume TopBar is sticky (in TopBar.jsx).
         */}
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
  );
}
