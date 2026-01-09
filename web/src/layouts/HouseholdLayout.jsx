import { useEffect } from 'react';
import { Outlet, useParams, useNavigate } from 'react-router-dom';
import { Box, Toolbar } from '@mui/material';
import NavSidebar from '../components/NavSidebar';

export default function HouseholdLayout({ 
  drawerOpen, 
  toggleDrawer, 
  households, 
  onSelectHousehold,
  api 
}) {
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Find the household matching the ID in the URL
    const targetHousehold = households.find(h => h.id === parseInt(id));
    
    if (targetHousehold) {
      // If found, activate it in the global state
      onSelectHousehold(targetHousehold);
    } else if (households.length > 0) {
      // If the ID is invalid (e.g., user deleted it or typed wrong ID),
      // redirect to dashboard or the first available household.
      // Ideally, check if households are loaded first.
      navigate('/');
    }
  }, [id, households, onSelectHousehold, navigate]);

  return (
    <Box sx={{ display: 'flex' }}>
      <NavSidebar open={drawerOpen} toggleDrawer={toggleDrawer} />
      <Box component="main" sx={{ flexGrow: 1, width: '100%', p: 3 }}>
        <Toolbar /> {/* Spacer for Fixed AppBar */}
        <Outlet context={{ api }} />
      </Box>
    </Box>
  );
}
