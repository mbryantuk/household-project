import { useState, useEffect } from 'react';
import { 
  Sheet, List, ListItem, ListItemButton, ListItemDecorator, ListItemContent, 
  IconButton, Divider, Box, Avatar, Typography, Menu, MenuItem, Modal, ModalDialog, DialogTitle, DialogContent, FormControl, FormLabel, Input, Button, DialogActions, Tooltip
} from '@mui/joy';
import { 
  Settings, Home as HomeIcon, Event, 
  Groups, Pets, HomeWork, DirectionsCar, 
  Calculate, NoteAlt, CalendarMonth, GetApp,
  Logout, Edit, KeyboardArrowRight, ChevronLeft, Handyman
} from '@mui/icons-material';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { getEmojiColor } from '../theme';
import EmojiPicker from './EmojiPicker';
import TotemIcon from './TotemIcon';

// Layout Constants
const RAIL_WIDTH = 72;
const PANEL_WIDTH = 240;

export default function NavSidebar({ 
    members = [], vehicles = [], isDark, household, user, 
    onLogout, onUpdateProfile, onModeChange, onInstall, canInstall,
    toggleCalendar, toggleCalc, toggleNote 
}) {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Active Category State (Controls Panel)
  const [activeCategory, setActiveCategory] = useState(null);
  
  // Infer active category on mount/path change
  useEffect(() => {
      const path = location.pathname;
      if (path.includes('/people')) setActiveCategory('people');
      else if (path.includes('/pets')) setActiveCategory('pets');
      else if (path.includes('/vehicles')) setActiveCategory('vehicles');
      else if (path.includes('/house/') || path.endsWith('/house')) setActiveCategory('house'); 
      else if (path.includes('/settings')) setActiveCategory('settings');
      else setActiveCategory(null); 
  }, [location.pathname]);

  // Profile Dialog State
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [formData, setFormData] = useState({ avatar: '' });

  // --- Handlers ---
  const handleCategoryClick = (category, hasSubItems) => {
      if (activeCategory === category) {
          setActiveCategory(null);
      } else {
          setActiveCategory(category);
          if (!hasSubItems) {
              setActiveCategory(null); 
          }
      }
  };

  const openProfile = () => {
    setFormData({ avatar: user?.avatar || '' });
    setProfileOpen(true);
    setUserMenuAnchor(null);
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const updates = {
      username: form.get('username'),
      first_name: form.get('first_name'),
      last_name: form.get('last_name'),
      email: form.get('email'),
      avatar: formData.avatar 
    };
    const password = form.get('password');
    if (password) updates.password = password;

    try {
      if (onUpdateProfile) await onUpdateProfile(updates);
      setProfileOpen(false);
    } catch (err) {
      console.error("Failed to update profile");
    }
  };

  // --- Renders ---

  const RailIcon = ({ icon, label, category, to, hasSubItems, onClick }) => {
      const isActive = activeCategory === category || (to && location.pathname.includes(to));
      
      return (
        <Tooltip title={label} placement="right" arrow>
            <ListItem>
                <ListItemButton 
                    selected={isActive}
                    onClick={() => {
                        if (onClick) {
                            onClick();
                        } else {
                            if (to) navigate(to);
                            handleCategoryClick(category, hasSubItems);
                        }
                    }}
                    sx={{ 
                        borderRadius: 'md', 
                        justifyContent: 'center', 
                        px: 0,
                        flexDirection: 'column',
                        gap: 0.5,
                        py: 1,
                        width: 56, 
                        mx: 'auto'
                    }}
                >
                    <ListItemDecorator sx={{ display: 'flex', justifyContent: 'center', m: 0 }}>
                        {icon}
                    </ListItemDecorator>
                    <Typography level="body-xs" sx={{ fontSize: '10px' }}>{label}</Typography>
                </ListItemButton>
            </ListItem>
        </Tooltip>
      );
  };

  const SubItem = ({ label, to, emoji }) => (
      <ListItem>
          <ListItemButton component={NavLink} to={to} sx={{ borderRadius: 'sm' }}>
              <ListItemDecorator>
                {emoji ? (
                    <Avatar size="sm" sx={{ '--Avatar-size': '20px', fontSize: '0.9rem', bgcolor: getEmojiColor(emoji, isDark) }}>{emoji}</Avatar>
                ) : <KeyboardArrowRight />}
              </ListItemDecorator>
              <ListItemContent>{label}</ListItemContent>
          </ListItemButton>
      </ListItem>
  );

  return (
    <Box sx={{ display: 'flex', height: '100%', zIndex: 1000, position: 'relative' }}>
        
        {/* === RAIL (Primary Navigation) === */}
        <Sheet
            sx={{
                width: RAIL_WIDTH,
                borderRight: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                py: 2,
                bgcolor: 'background.surface',
                zIndex: 1002,
                height: '100%' 
            }}
        >
            {/* Household Icon (Top) */}
            <Box sx={{ mb: 2 }}>
                <Box 
                    sx={{ 
                        width: 48, height: 48, borderRadius: '50%', 
                        bgcolor: getEmojiColor(household?.avatar || '?', isDark),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.5rem', cursor: 'pointer',
                        border: '2px solid', borderColor: 'divider',
                        overflow: 'hidden'
                    }}
                >
                    {household?.avatar ? (household.avatar.startsWith('data:image') ? <img src={household.avatar} alt="HH" style={{width:'100%'}}/> : household.avatar) : <TotemIcon />}
                </Box>
            </Box>

            <List size="sm" sx={{ '--ListItem-radius': '8px', '--List-gap': '4px', width: '100%' }}>
                <RailIcon icon={<HomeIcon />} label="Home" category="dashboard" to="dashboard" />
                <RailIcon icon={<Event />} label="Events" category="calendar" to="calendar" />
                <Divider sx={{ my: 1, mx: 1.5 }} />
                <RailIcon icon={<Groups />} label="People" category="people" hasSubItems />
                <RailIcon icon={<Pets />} label="Pets" category="pets" hasSubItems />
                <RailIcon icon={<HomeWork />} label="House" category="house" hasSubItems />
                <RailIcon icon={<DirectionsCar />} label="Vehicles" category="vehicles" hasSubItems />
                <Divider sx={{ my: 1, mx: 1.5 }} />
                <RailIcon icon={<Handyman />} label="Tools" category="tools" hasSubItems />
                <RailIcon icon={<Settings />} label="Settings" category="settings" to="settings" hasSubItems />
            </List>

            <Box sx={{ flexGrow: 1 }} />

            {/* Bottom Section (Profile Only) */}
            <Box sx={{ mt: 'auto', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Divider sx={{ my: 1, width: '60%' }} />
                <Box sx={{ mt: 1, mb: 1 }}>
                    <Avatar 
                        onClick={(e) => setUserMenuAnchor(e.currentTarget)}
                        sx={{ cursor: 'pointer', bgcolor: getEmojiColor(user?.avatar || '?', isDark) }}
                    >
                        {user?.avatar || user?.username?.[0]}
                    </Avatar>
                </Box>
            </Box>
        </Sheet>

        {/* === PANEL (Secondary Navigation) === */}
        <Sheet
            sx={{
                width: activeCategory ? PANEL_WIDTH : 0,
                borderRight: activeCategory ? '1px solid' : 'none',
                borderColor: 'divider',
                overflow: 'hidden',
                transition: 'width 0.2s',
                display: 'flex',
                flexDirection: 'column',
                bgcolor: 'background.level1',
                zIndex: 1001,
                whiteSpace: 'nowrap',
                height: '100%' 
            }}
        >
            <Box sx={{ 
                p: 2, 
                borderBottom: '1px solid', 
                borderColor: 'divider',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <Typography level="title-md" textTransform="uppercase" letterSpacing="1px">
                    {activeCategory}
                </Typography>
                <IconButton size="sm" variant="plain" color="neutral" onClick={() => setActiveCategory(null)}>
                    <ChevronLeft />
                </IconButton>
            </Box>
            
            <List sx={{ flexGrow: 1, overflowY: 'auto', p: 1 }}>
                {activeCategory === 'people' && (
                    <>
                        <ListItem><Typography level="body-xs" fontWeight="bold" sx={{ p: 1 }}>MEMBERS</Typography></ListItem>
                        {members.filter(m => m.type !== 'pet').map(m => (
                            <SubItem key={m.id} label={m.name} to={`people/${m.id}`} emoji={m.emoji} />
                        ))}
                        <Divider sx={{ my: 1 }} />
                        <SubItem label="Add New Person" to="people/new" />
                    </>
                )}

                {activeCategory === 'pets' && (
                    <>
                        <ListItem><Typography level="body-xs" fontWeight="bold" sx={{ p: 1 }}>PETS</Typography></ListItem>
                        {members.filter(m => m.type === 'pet').map(m => (
                            <SubItem key={m.id} label={m.name} to={`pets/${m.id}`} emoji={m.emoji} />
                        ))}
                        <Divider sx={{ my: 1 }} />
                        <SubItem label="Add New Pet" to="pets/new" />
                    </>
                )}

                {activeCategory === 'house' && (
                    <>
                        <ListItem><Typography level="body-xs" fontWeight="bold" sx={{ p: 1 }}>PROPERTIES</Typography></ListItem>
                        <SubItem label={household?.name || 'Main House'} to={`house/${household?.id || 1}`} emoji={household?.avatar || '🏠'} />
                    </>
                )}

                {activeCategory === 'vehicles' && (
                    <>
                        <ListItem><Typography level="body-xs" fontWeight="bold" sx={{ p: 1 }}>FLEET</Typography></ListItem>
                        {vehicles.map(v => (
                            <SubItem key={v.id} label={`${v.make} ${v.model}`} to={`vehicles/${v.id}`} emoji={v.emoji} />
                        ))}
                        <Divider sx={{ my: 1 }} />
                        <SubItem label="Add New Vehicle" to="vehicles/new" />
                    </>
                )}

                {activeCategory === 'tools' && (
                    <>
                       <ListItem><Typography level="body-xs" fontWeight="bold" sx={{ p: 1 }}>UTILITIES</Typography></ListItem>
                       <ListItem>
                           <ListItemButton onClick={toggleNote} sx={{ borderRadius: 'sm' }}>
                               <ListItemDecorator><NoteAlt /></ListItemDecorator>
                               <ListItemContent>Sticky Notes</ListItemContent>
                           </ListItemButton>
                       </ListItem>
                       <ListItem>
                           <ListItemButton onClick={toggleCalc} sx={{ borderRadius: 'sm' }}>
                               <ListItemDecorator><Calculate /></ListItemDecorator>
                               <ListItemContent>Calculator</ListItemContent>
                           </ListItemButton>
                       </ListItem>
                       <ListItem>
                           <ListItemButton onClick={toggleCalendar} sx={{ borderRadius: 'sm' }}>
                               <ListItemDecorator><CalendarMonth /></ListItemDecorator>
                               <ListItemContent>Calendar</ListItemContent>
                           </ListItemButton>
                       </ListItem>
                       
                       {canInstall && (
                           <>
                               <Divider sx={{ my: 1 }} />
                               <ListItem>
                                   <ListItemButton onClick={onInstall} sx={{ borderRadius: 'sm' }}>
                                       <ListItemDecorator><GetApp /></ListItemDecorator>
                                       <ListItemContent>Install App</ListItemContent>
                                   </ListItemButton>
                               </ListItem>
                           </>
                       )}
                    </>
                )}

                {activeCategory === 'settings' && (
                    <>
                       <SubItem label="General" to="settings" />
                       <ListItem><Typography level="body-xs" sx={{ p: 1 }}>Theme</Typography></ListItem>
                       <ListItem>
                           <Button 
                                variant="soft" 
                                color="neutral" 
                                fullWidth 
                                onClick={() => onModeChange(isDark ? 'light' : 'dark')}
                            >
                                {isDark ? 'Switch to Light' : 'Switch to Dark'}
                            </Button>
                       </ListItem>
                    </>
                )}
            </List>
        </Sheet>

        {/* === MENUS & DIALOGS === */}
        <Menu
            anchorEl={userMenuAnchor}
            open={Boolean(userMenuAnchor)}
            onClose={() => setUserMenuAnchor(null)}
            placement="right-end"
            size="sm"
            sx={{ minWidth: 180, zIndex: 1300 }}
        >
            <MenuItem onClick={openProfile}><Edit /> Edit Profile</MenuItem>
            <Divider />
            <MenuItem onClick={onLogout} color="danger"><Logout /> Logout</MenuItem>
        </Menu>

        <Modal open={profileOpen} onClose={() => setProfileOpen(false)}>
          <ModalDialog sx={{ maxWidth: 500, width: '100%', zIndex: 1301 }}>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogContent>
              <form onSubmit={handleProfileSubmit}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                       <Box 
                        sx={{ 
                          width: 80, height: 80, borderRadius: '50%', 
                          bgcolor: getEmojiColor(formData.avatar || '👤', isDark),
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '2.5rem', cursor: 'pointer', border: '3px solid', borderColor: 'primary.solidBg'
                        }}
                        onClick={() => setEmojiPickerOpen(true)}
                       >
                        {formData.avatar || '👤'}
                       </Box>
                    </Box>

                    <FormControl required>
                        <FormLabel>Username</FormLabel>
                        <Input name="username" defaultValue={user?.username} />
                    </FormControl>

                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <FormControl sx={{ flex: 1 }}>
                            <FormLabel>First Name</FormLabel>
                            <Input name="first_name" defaultValue={user?.first_name} />
                        </FormControl>
                        <FormControl sx={{ flex: 1 }}>
                            <FormLabel>Last Name</FormLabel>
                            <Input name="last_name" defaultValue={user?.last_name} />
                        </FormControl>
                    </Box>

                    <FormControl>
                        <FormLabel>Email</FormLabel>
                        <Input name="email" defaultValue={user?.email} />
                    </FormControl>

                    <FormControl>
                        <FormLabel>New Password</FormLabel>
                        <Input name="password" type="password" placeholder="Leave blank to keep current" />
                    </FormControl>

                    <DialogActions>
                        <Button variant="plain" color="neutral" onClick={() => setProfileOpen(false)}>Cancel</Button>
                        <Button type="submit">Save Changes</Button>
                    </DialogActions>
                  </Box>
              </form>
            </DialogContent>
          </ModalDialog>
        </Modal>

        <EmojiPicker 
          open={emojiPickerOpen} 
          onClose={() => setEmojiPickerOpen(false)} 
          onEmojiSelect={(emoji) => {
            setFormData(prev => ({ ...prev, avatar: emoji }));
            setEmojiPickerOpen(false);
          }} 
          title="Select Avatar Emoji"
          isDark={isDark}
        />
    </Box>
  );
}