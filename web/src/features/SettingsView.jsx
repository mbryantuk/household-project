import { useState, useRef } from 'react';
import { 
  Box, Typography, Paper, Tabs, Tab, TextField, Grid, 
  ToggleButtonGroup, ToggleButton, Divider, Button,
  TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
  Chip, IconButton, FormControl, InputLabel, Select, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions, Avatar, Card, CardHeader,
  Stack, Tooltip, Switch, FormControlLabel, InputAdornment
} from '@mui/material';
import { 
  Info, ManageAccounts, Groups, PersonAdd, Delete, 
  AddCircle, HomeWork, Warning, Edit,
  DarkMode, LightMode, SettingsBrightness, ChildCare, Face, Visibility,
  Language, Public, AccountBalance, Upload, AddReaction, ContentCopy, Key
} from '@mui/icons-material';
import TotemIcon from '../components/TotemIcon';

const PET_SPECIES = ['Dog', 'Cat', 'Hamster', 'Rabbit', 'Bird', 'Fish', 'Reptile', 'Other'];
const QUICK_EMOJIS = ['🏠', '🏡', '🏢', '🏰', '🐾', '🛡️', '🧪'];

const EMOJI_CATEGORIES = [
  { label: 'Smileys', emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '🤨', '🧐'] },
  { label: 'Animals', emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🕸️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🐘', '🦏', '🦛', '🐪', '🐫', '🦒', '🦘', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🐈', '🐓', '🦃', '🦚', '🦜', '🦢', '🕊️', '🐇', '🦝', '🦨', '🦡', '🦦', '🦥', '🐁', '🐀', '🐿️', '🦔'] },
  { label: 'House & Travel', emojis: ['🏠', '🏡', '🏘️', '🏚️', '🏗️', '🏢', '🏣', '🏤', '🏥', '🏦', '🏨', '🏩', '🏪', '🏫', '🏬', '🏭', '🏯', '🏰', '💒', '🗼', '🗼', '🗽', '⛪', '🕌', '🕍', '⛩️', '🕋', '⛲', '⛺', '🌁', '🌃', '🏙️', '🌄', '🌅', '🌆', '🌇', '🌉', '♨️', '🎠', '🎡', '🎢', '🚂', '🚃', '🚄', '🚅', '🚆', '🚇', '🚈', '🚉', '🚊', '🚝', '🚞', '🚋', '🚌', '🚍', '🚎', '🚐', '🚑', '🚒', '🚓', '🚔', '🚕', '🚖', '🚗', '🚘', '🚙', '🚚', '🚛', '🚜', '🏎️', '🏍️', '🛵', '🚲', '🛴', '🛹', '🛶', '⛵', '🚤', '🛥️', '🛳️', '⛴️', '🚢', '✈️', '🛫', '🛬', '💺', '🚁', '🚟', '🚠', '🚡', '🚀', '🛸', '🛰️', '🪐', '🌠', '🌌', '🌍', '🌎', '🌏', '🌐', '🗺️', '🗺️', '🗾', '🧭'] },
  { label: 'Food & Drink', emojis: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌽', '🥕', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🥪', '🥙', '🧆', '🌮', '🌯', '🥗', '🥘', '🥣', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🧂', '🍩', '🍪', '🌰', '🥜', '🥤', '🧃', '🥛', '☕', '🍵', '🧉', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🍶'] },
  { label: 'Objects & Symbols', emojis: ['⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💽', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋', '🔌', '💡', '🔦', '🕯️', '🪔', '🧯', '🛢️', '💸', '💵', '💴', '💶', '💷', '💰', '💳', '💎', '⚖️', '🧰', '🔧', '🔨', '⚒️', '🛠️', '⛏️', '🔩', '⚙️', '🧱', '⛓️', '🧲', '🔫', '💣', '🧨', '🪓', '🔪', '🗡️', '⚔️', '🛡️', '🚬', '⚰️', '⚱️', '🏺', '🔮', '📿', '🧿', '💈', '⚗️', '🔭', '🔬', '🕳️', '🩹', '🩺', '💊', '💉', '🩸', '🧬', '🦠', '🧫', '🧪', '🌡️', '🧹', '🧺', '🧻', '🚽', '🚰', '🚿', '🛁', '🧼', '🪒', '🧴', '🧷', '🧹'] }
];

export default function SettingsView({ 
  household, 
  users, 
  currentUser,
  onUpdateHousehold,
  onDeleteHousehold,
  onCreateUser,
  onUpdateUser,
  onRemoveUser,
  currentMode,
  onModeChange,
  useDracula,
  onDraculaChange,
  members,
  onAddMember,
  onRemoveMember,
  onUpdateMember
}) {
  const [tab, setTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('tab');
    return t ? parseInt(t) : 0;
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [emojiPickerTarget, setEmojiPickerTarget] = useState(null); // 'household', 'newMember', 'editMember'
  const fileInputRef = useRef(null);

  // Residents State
  const [memberType, setMemberType] = useState('adult');
  const [newMemberEmoji, setNewMemberEmoji] = useState('👤');
  const [newUserEmoji, setNewUserEmoji] = useState('👤');
  const [editMember, setEditMember] = useState(null);

  // 🛡️ PERMISSION CHECK
  const isHouseholdAdmin = currentUser?.role === 'admin' || currentUser?.role === 'sysadmin';

  if (!household) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">Loading household settings...</Typography>
      </Box>
    );
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 512000) {
      alert("File is too large. Please select an image under 500KB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      onUpdateHousehold({ avatar: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault(); 
    const userData = {
      username: e.target.newUsername.value,
      password: e.target.newPassword.value,
      email: e.target.newEmail.value,
      role: e.target.newRole.value,
      avatar: newUserEmoji
    };
    onCreateUser(userData);
    setCreateOpen(false);
    setNewUserEmoji('👤');
  };

  const handleEditClick = (u) => {
    setEditingUser(u);
    setEditOpen(true);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    const updates = {};
    if (e.target.editUsername.value) updates.username = e.target.editUsername.value;
    if (e.target.editEmail.value) updates.email = e.target.editEmail.value;
    if (e.target.editRole.value) updates.role = e.target.editRole.value;
    if (e.target.editPassword.value) updates.password = e.target.editPassword.value;
    if (editingUser.avatar) updates.avatar = editingUser.avatar;
    
    onUpdateUser(editingUser.id, updates);
    setEditOpen(false);
    setEditingUser(null);
  };

  const getResidentAvatar = (m) => {
    if (m.emoji) return m.emoji;
    const type = m?.type?.toLowerCase();
    const gender = m?.gender?.toLowerCase();
    const species = m?.species?.toLowerCase();
    
    if (type === 'pet') {
      switch (species) {
        case 'dog': return '🐶'; case 'cat': return '🐱'; case 'hamster': return '🐹';
        case 'bird': return '🐦'; case 'fish': return '🐟'; default: return '🐾';
      }
    }
    if (type === 'viewer') return <Visibility />; 
    if (gender === 'male') return type === 'child' ? '👦' : '👨';
    if (gender === 'female') return type === 'child' ? '👧' : '👩';
    return type === 'child' ? <ChildCare /> : <Face />;
  };

  const handleEditMemberSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    data.emoji = editMember.emoji;
    onUpdateMember(editMember.id, data);
    setEditMember(null);
  };

  const renderCurrentAvatar = () => {
    if (!household.avatar) return <TotemIcon sx={{ fontSize: 40 }} />;
    if (household.avatar.startsWith('data:image')) {
      return <Avatar src={household.avatar} sx={{ width: 60, height: 60, border: '2px solid', borderColor: 'primary.main' }} />;
    }
    return <Box sx={{ fontSize: '2.5rem' }}>{household.avatar}</Box>;
  };

  const handleEmojiSelect = (emoji) => {
    if (emojiPickerTarget === 'household') {
      onUpdateHousehold({ avatar: emoji });
    } else if (emojiPickerTarget === 'newMember') {
      setNewMemberEmoji(emoji);
    } else if (emojiPickerTarget === 'editMember') {
      setEditMember({ ...editMember, emoji });
    } else if (emojiPickerTarget === 'editUser') {
      setEditingUser({ ...editingUser, avatar: emoji });
    } else if (emojiPickerTarget === 'newUser') {
      setNewUserEmoji(emoji);
    }
    setEmojiPickerTarget(null);
  };

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
      <Tabs 
        value={tab} 
        onChange={(e, v) => setTab(v)} 
        sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'action.hover' }}
      >
        <Tab label="General" icon={<Info fontSize="small"/>} iconPosition="start" />
        <Tab label="Residents" icon={<Groups fontSize="small"/>} iconPosition="start" />
        <Tab label="App Access" icon={<ManageAccounts fontSize="small"/>} iconPosition="start" />
      </Tabs>

      {/* --- TAB 0: GENERAL --- */}
      {tab === 0 && (
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Household Details</Typography>
          
          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid item xs={12} md={6}>
              <TextField 
                label="Household Name" 
                defaultValue={household.name || ''} 
                fullWidth 
                disabled={!isHouseholdAdmin} 
                onBlur={(e) => onUpdateHousehold({ name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Household Access Key"
                value={household.access_key || ''}
                fullWidth
                InputProps={{
                  readOnly: true,
                  startAdornment: (
                    <InputAdornment position="start">
                      <Key fontSize="small" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="Copy Key">
                        <IconButton 
                          size="small" 
                          onClick={() => {
                            if (navigator.clipboard && navigator.clipboard.writeText) {
                              navigator.clipboard.writeText(household.access_key);
                              alert("Key copied to clipboard!");
                            } else {
                              alert("Copying failed. Your Access Key is: " + household.access_key);
                            }
                          }}
                        >
                          <ContentCopy fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ),
                }}
                helperText="Used for family members to join this household."
              />
            </Grid>
          </Grid>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 4 }}>
             <Box sx={{ 
                width: 80, height: 80, 
                borderRadius: '50%', 
                bgcolor: 'background.default', 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid', borderColor: 'divider',
                boxShadow: 1
             }}>
                {renderCurrentAvatar()}
             </Box>
             <Box>
                <Typography variant="subtitle2" gutterBottom>Household Avatar</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                   <ToggleButtonGroup
                      size="small"
                      value={QUICK_EMOJIS.includes(household.avatar) ? household.avatar : ''}
                      exclusive
                      onChange={(e, v) => v && onUpdateHousehold({ avatar: v })}
                      disabled={!isHouseholdAdmin}
                    >
                      {QUICK_EMOJIS.map(a => (
                        <ToggleButton key={a} value={a} sx={{ fontSize: '1.2rem', px: 1.5 }}>
                          {a}
                        </ToggleButton>
                      ))}
                    </ToggleButtonGroup>
                    
                    <Divider orientation="vertical" flexItem />
                    
                    <Button 
                        variant="outlined" 
                        size="small" 
                        startIcon={<AddReaction />}
                        onClick={() => setEmojiPickerTarget('household')}
                        disabled={!isHouseholdAdmin}
                    >
                        Pick Emoji
                    </Button>

                    <Button 
                        variant="contained" 
                        size="small" 
                        startIcon={<Upload />}
                        onClick={() => fileInputRef.current.click()}
                        disabled={!isHouseholdAdmin}
                    >
                        Upload
                    </Button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        hidden 
                        accept="image/*" 
                        onChange={handleFileUpload} 
                    />
                    
                    {household.avatar && (
                        <Button size="small" color="error" onClick={() => onUpdateHousehold({ avatar: null })}>Reset</Button>
                    )}
                </Stack>
             </Box>
          </Box>

          <Typography variant="subtitle2" gutterBottom>Address Information</Typography>
          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid item xs={12}>
              <TextField 
                label="Street Address" 
                defaultValue={household.address_street || ''} 
                fullWidth 
                disabled={!isHouseholdAdmin}
                onBlur={(e) => onUpdateHousehold({ address_street: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={8}>
              <TextField 
                label="City" 
                defaultValue={household.address_city || ''} 
                fullWidth 
                disabled={!isHouseholdAdmin}
                onBlur={(e) => onUpdateHousehold({ address_city: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField 
                label="Zip Code" 
                defaultValue={household.address_zip || ''} 
                fullWidth 
                disabled={!isHouseholdAdmin}
                onBlur={(e) => onUpdateHousehold({ address_zip: e.target.value })}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 4 }} />

          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
             <Public fontSize="small" /> Regional Settings
          </Typography>
          <Grid container spacing={2} sx={{ mb: 4 }}>
             <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>Date Format</InputLabel>
                  <Select 
                    value={household.date_format || 'MM/DD/YYYY'} 
                    label="Date Format"
                    disabled={!isHouseholdAdmin}
                    onChange={(e) => onUpdateHousehold({ date_format: e.target.value })}
                  >
                    <MenuItem value="MM/DD/YYYY">MM/DD/YYYY</MenuItem>
                    <MenuItem value="DD/MM/YYYY">DD/MM/YYYY</MenuItem>
                    <MenuItem value="YYYY-MM-DD">YYYY-MM-DD</MenuItem>
                  </Select>
                </FormControl>
             </Grid>
             <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>Currency</InputLabel>
                  <Select 
                    value={household.currency || 'USD'} 
                    label="Currency"
                    disabled={!isHouseholdAdmin}
                    onChange={(e) => onUpdateHousehold({ currency: e.target.value })}
                  >
                    <MenuItem value="USD">USD ($)</MenuItem>
                    <MenuItem value="EUR">EUR (€)</MenuItem>
                    <MenuItem value="GBP">GBP (£)</MenuItem>
                    <MenuItem value="AUD">AUD ($)</MenuItem>
                    <MenuItem value="CAD">CAD ($)</MenuItem>
                  </Select>
                </FormControl>
             </Grid>
             <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>Decimal Places</InputLabel>
                  <Select 
                    value={household.decimals ?? 2} 
                    label="Decimal Places"
                    disabled={!isHouseholdAdmin}
                    onChange={(e) => onUpdateHousehold({ decimals: parseInt(e.target.value) })}
                  >
                    <MenuItem value={0}>0 (No decimals)</MenuItem>
                    <MenuItem value={1}>1 (0.0)</MenuItem>
                    <MenuItem value={2}>2 (0.00)</MenuItem>
                    <MenuItem value={3}>3 (0.000)</MenuItem>
                  </Select>
                </FormControl>
             </Grid>
          </Grid>

          <Divider sx={{ my: 4 }} />

          <Typography variant="h6" gutterBottom>Appearance</Typography>
          
          <Box sx={{ mb: 2 }}>
            <FormControlLabel
              control={
                <Switch 
                  checked={useDracula} 
                  onChange={(e) => onDraculaChange(e.target.checked)} 
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography variant="body1">Dracula / Alucard Theme</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Use high-contrast Dracula (Dark) and Alucard (Light) colors.
                  </Typography>
                </Box>
              }
            />
          </Box>

          <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>Display Mode</Typography>
          <ToggleButtonGroup
            value={currentMode || 'system'}
            exclusive
            onChange={(e, v) => v && onModeChange(v)}
            sx={{ mb: 4 }}
          >
            <ToggleButton value="light">
              <LightMode sx={{ mr: 1 }} fontSize="small" /> Light
            </ToggleButton>
            <ToggleButton value="dark">
              <DarkMode sx={{ mr: 1 }} fontSize="small" /> Dark
            </ToggleButton>
            <ToggleButton value="system">
              <SettingsBrightness sx={{ mr: 1 }} fontSize="small" /> System
            </ToggleButton>
          </ToggleButtonGroup>

          {/* 🔴 DANGER ZONE */}
          {isHouseholdAdmin && (
            <>
              <Divider sx={{ my: 4 }} />
              <Box sx={{ 
                p: 3, 
                borderRadius: 2, 
                border: '1px solid', 
                borderColor: 'error.light', 
                bgcolor: 'rgba(211, 47, 47, 0.04)' 
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, color: 'error.main' }}>
                  <Warning sx={{ mr: 1 }} fontSize="small" />
                  <Typography variant="h6">Danger Zone</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Deleting this household will permanently remove all resident data, logs, and authorized user connections.
                </Typography>
                <Button 
                  variant="contained" 
                  color="error" 
                  startIcon={<Delete />}
                  onClick={() => onDeleteHousehold(household.id)}
                >
                  Delete {household.name}
                </Button>
              </Box>
            </>
          )}
        </Box>
      )}

      {/* --- TAB 1: RESIDENTS --- */}
      {tab === 1 && (
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Household Residents</Typography>
          
          {/* ADD FORM */}
          <Box 
            component="form" 
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const data = Object.fromEntries(formData.entries());
              data.emoji = newMemberEmoji;
              onAddMember({ ...e, currentTarget: { ...e.currentTarget, ...data }, preventDefault: () => {} });
              setNewMemberEmoji('👤');
            }} 
            sx={{ mb: 4, p: 3, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
          >
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={1}>
                <Tooltip title="Click to pick emoji">
                    <IconButton onClick={() => setEmojiPickerTarget('newMember')} sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                        {newMemberEmoji}
                    </IconButton>
                </Tooltip>
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Type</InputLabel>
                  <Select name="type" value={memberType} label="Type" onChange={(e) => setMemberType(e.target.value)}>
                    <MenuItem value="adult">Adult</MenuItem>
                    <MenuItem value="child">Child</MenuItem>
                    <MenuItem value="viewer">Viewer</MenuItem>
                    <MenuItem value="pet">Pet</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={8}><TextField name="name" label="Full Name" fullWidth size="small" required /></Grid>
              {memberType !== 'pet' ? (
                <>
                  <Grid item xs={12} sm={4}><TextField name="alias" label="Alias" fullWidth size="small" /></Grid>
                  <Grid item xs={12} sm={4}><TextField name="dob" label="DOB" type="date" fullWidth size="small" InputLabelProps={{ shrink: true }} /></Grid>
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Gender</InputLabel>
                      <Select name="gender" label="Gender" defaultValue="none">
                        <MenuItem value="none">Not Specified</MenuItem><MenuItem value="male">Male</MenuItem><MenuItem value="female">Female</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </>
              ) : (
                <Grid item xs={12} sm={12}>
                  <FormControl fullWidth size="small"><InputLabel>Species</InputLabel>
                    <Select name="species" label="Species" defaultValue="Dog">{PET_SPECIES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}</Select>
                  </FormControl>
                </Grid>
              )}
              <Grid item xs={12}><Button type="submit" variant="contained" fullWidth startIcon={<PersonAdd />}>Add Resident</Button></Grid>
            </Grid>
          </Box>

          {/* LIST */}
          <Grid container spacing={2}>
            {members && members.map((m) => (
              <Grid item xs={12} sm={6} md={4} key={m.id}>
                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardHeader
                    avatar={<Avatar sx={{ bgcolor: m.type === 'pet' ? 'warning.light' : 'primary.light', color: 'primary.contrastText', fontSize: '1.2rem' }}>
                        {m.emoji || getResidentAvatar(m)}
                    </Avatar>}
                    action={
                      <Box>
                        <IconButton size="small" onClick={() => setEditMember(m)}><Edit fontSize="small" /></IconButton>
                        <IconButton color="error" size="small" onClick={() => onRemoveMember(m.id)}><Delete fontSize="small" /></IconButton>
                      </Box>
                    }
                    title={m.name || 'Unnamed Resident'}
                    subheader={m.alias ? `"${m.alias}"` : (m.type ? m.type.toUpperCase() : 'RESIDENT')}
                  />
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* --- TAB 2: APP ACCESS --- */}
      {tab === 2 && (
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography variant="h6">App Access</Typography>
              <Typography variant="caption" color="text.secondary">
                Control who can log in to <strong>{household.name}</strong>.
              </Typography>
            </Box>
            <Button 
              variant="contained" 
              size="small" 
              startIcon={<PersonAdd />} 
              onClick={() => setCreateOpen(true)}
              disabled={!isHouseholdAdmin}
            >
              Grant Access
            </Button>
          </Box>

          <TableContainer component={Paper} variant="outlined" elevation={0}>
            <Table size="small">
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell>Account</TableCell>
                  <TableCell>Access Level</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users && users.map(u => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight="500">{u.username}</Typography>
                        {u.system_role === 'sysadmin' && (
                          <Chip label="SysAdmin" size="small" color="warning" variant="outlined" sx={{ height: 20, fontSize: '0.6rem' }} />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={u.role.toUpperCase()} 
                        size="small" 
                        color={u.role === 'admin' ? 'primary' : 'default'} 
                        variant={u.role === 'viewer' ? 'outlined' : 'filled'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      {isHouseholdAdmin && u.username !== currentUser.username && (
                        <IconButton size="small" onClick={() => handleEditClick(u)} title="Edit User">
                          <Edit fontSize="small" />
                        </IconButton>
                      )}
                      <IconButton 
                        size="small" 
                        color="error" 
                        onClick={() => onRemoveUser(u.id)}
                        disabled={!isHouseholdAdmin || u.username === currentUser.username} 
                        title="Revoke Access"
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* EMOJI PICKER DIALOG */}
      <Dialog open={!!emojiPickerTarget} onClose={() => setEmojiPickerTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Select Emoji</DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <Box sx={{ p: 2 }}>
            {EMOJI_CATEGORIES.map((cat) => (
              <Box key={cat.label} sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="primary" gutterBottom sx={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 }}>
                  {cat.label}
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))', gap: 1 }}>
                  {cat.emojis.map((emoji) => (
                    <IconButton 
                      key={emoji} 
                      onClick={() => handleEmojiSelect(emoji)}
                      sx={{ fontSize: '1.5rem', '&:hover': { bgcolor: 'action.selected' } }}
                    >
                      {emoji}
                    </IconButton>
                  ))}
                </Box>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmojiPickerTarget(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* GRANT ACCESS DIALOG */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleCreateSubmit}>
          <DialogTitle>Grant Access</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Create a new account for a family member.
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
               <Box 
                 sx={{ 
                   width: 60, height: 60, 
                   borderRadius: '50%', 
                   bgcolor: 'background.default', 
                   display: 'flex', alignItems: 'center', justifyContent: 'center',
                   border: '1px solid', borderColor: 'divider',
                   boxShadow: 1,
                   cursor: 'pointer',
                   fontSize: '1.8rem'
                 }}
                 onClick={() => setEmojiPickerTarget('newUser')}
               >
                 {newUserEmoji}
               </Box>
               <Button size="small" onClick={() => setEmojiPickerTarget('newUser')}>Set Avatar</Button>
            </Box>
            
            <TextField margin="dense" name="newUsername" label="Username" fullWidth required />
            <TextField margin="dense" name="newPassword" label="Password" type="password" fullWidth required />
            <TextField margin="dense" name="newEmail" label="Email (Optional)" type="email" fullWidth />
            
            <FormControl fullWidth margin="dense">
              <InputLabel>Household Role</InputLabel>
              <Select name="newRole" defaultValue="member" label="Household Role">
                <MenuItem value="viewer">Viewer (Read Only)</MenuItem>
                <MenuItem value="member">Member (Can Edit)</MenuItem>
                <MenuItem value="admin">Admin (Full Control)</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Create & Assign</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* EDIT USER DIALOG */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleEditSubmit}>
          <DialogTitle>Edit User: {editingUser?.username}</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2, mt: 1 }}>
               <Box 
                 sx={{ 
                   width: 60, height: 60, 
                   borderRadius: '50%', 
                   bgcolor: 'background.default', 
                   display: 'flex', alignItems: 'center', justifyContent: 'center',
                   border: '1px solid', borderColor: 'divider',
                   boxShadow: 1,
                   cursor: 'pointer',
                   fontSize: '1.8rem'
                 }}
                 onClick={() => setEmojiPickerTarget('editUser')}
               >
                 {editingUser?.avatar || '👤'}
               </Box>
               <Button size="small" onClick={() => setEmojiPickerTarget('editUser')}>Change Avatar</Button>
            </Box>

            <TextField 
              margin="dense" name="editUsername" label="Username" 
              fullWidth defaultValue={editingUser?.username} required
            />
            <TextField 
              margin="dense" name="editEmail" label="Email Address" 
              fullWidth defaultValue={editingUser?.email}
            />
            <TextField 
              margin="dense" name="editPassword" label="New Password (Optional)" 
              type="password" fullWidth helperText="Leave blank to keep current password"
            />
            
            <FormControl fullWidth margin="dense">
              <InputLabel>Household Role</InputLabel>
              <Select name="editRole" defaultValue={editingUser?.role || 'member'} label="Household Role">
                <MenuItem value="viewer">Viewer (Read Only)</MenuItem>
                <MenuItem value="member">Member (Can Edit)</MenuItem>
                <MenuItem value="admin">Admin (Full Control)</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Save Changes</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* EDIT MEMBER DIALOG */}
      <Dialog open={Boolean(editMember)} onClose={() => setEditMember(null)} fullWidth maxWidth="sm">
        <form onSubmit={handleEditMemberSubmit}>
          <DialogTitle>Edit Resident</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={1}>
                <Tooltip title="Click to pick emoji">
                    <IconButton onClick={() => setEmojiPickerTarget('editMember')} sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                        {editMember?.emoji || '👤'}
                    </IconButton>
                </Tooltip>
              </Grid>
              <Grid item xs={12} sm={5}>
                <FormControl fullWidth size="small"><InputLabel>Type</InputLabel>
                  <Select name="type" defaultValue={editMember?.type} label="Type">
                    <MenuItem value="adult">Adult</MenuItem>
                    <MenuItem value="child">Child</MenuItem>
                    <MenuItem value="viewer">Viewer</MenuItem>
                    <MenuItem value="pet">Pet</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}><TextField name="name" label="Name" fullWidth size="small" defaultValue={editMember?.name} required /></Grid>
              <Grid item xs={12} sm={6}><TextField name="alias" label="Alias" fullWidth size="small" defaultValue={editMember?.alias} /></Grid>
              <Grid item xs={12} sm={6}><TextField name="dob" label="DOB" type="date" fullWidth size="small" defaultValue={editMember?.dob} InputLabelProps={{ shrink: true }} /></Grid>
              <Grid item xs={12} sm={6}>
                 <FormControl fullWidth size="small"><InputLabel>Gender</InputLabel>
                  <Select name="gender" defaultValue={editMember?.gender || 'none'} label="Gender">
                    <MenuItem value="none">None</MenuItem><MenuItem value="male">Male</MenuItem><MenuItem value="female">Female</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small"><InputLabel>Species</InputLabel>
                <Select name="species" defaultValue={editMember?.species || 'Dog'} label="Species">
                    {PET_SPECIES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions><Button onClick={() => setEditMember(null)}>Cancel</Button><Button type="submit" variant="contained">Save</Button></DialogActions>
        </form>
      </Dialog>
    </Paper>
  );
}