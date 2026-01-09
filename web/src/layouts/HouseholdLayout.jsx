import { useEffect, useState, useCallback } from 'react';
import { Outlet, useParams, useNavigate } from 'react-router-dom';
import { Box, Toolbar } from '@mui/material';
import NavSidebar from '../components/NavSidebar';

export default function HouseholdLayout({ 
  drawerOpen, 
  toggleDrawer, 
  households, 
  onSelectHousehold,
  api,
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

  const fetchVehicles = useCallback(async () => {
    try {
      const res = await api.get(`/households/${id}/vehicles`);
      setVehicles(res.data || []);
    } catch (err) {
      console.error("Failed to fetch vehicles for sidebar", err);
    }
  }, [api, id]);

  useEffect(() => {
    // Find the household matching the ID in the URL
    const targetHousehold = (households || []).find(h => h && h.id === parseInt(id));
    
    if (targetHousehold) {
      onSelectHousehold(targetHousehold);
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
      />
      <Box component="main" sx={{ flexGrow: 1, width: '100%', p: 3, pt: 1 }}>
        <Toolbar /> {/* Spacer for Fixed AppBar */}
        <Outlet context={{ 
            api, 
            id, 
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