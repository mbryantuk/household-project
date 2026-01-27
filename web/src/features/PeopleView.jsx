import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext, useParams, useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Sheet, Tabs, TabList, Tab, Input, Button, 
  FormControl, FormLabel, Divider,
  Tooltip, IconButton, Grid, Avatar, CircularProgress, Card
} from '@mui/joy';
import { 
  Delete, Add, Info, Payments, PhotoCamera
} from '@mui/icons-material';
import RecurringChargesWidget from '../components/ui/RecurringChargesWidget';
import EmojiPicker from '../components/EmojiPicker';
import AppSelect from '../components/ui/AppSelect';
import { getEmojiColor } from '../theme';

const MEMBER_TYPES = [
    { value: 'adult', label: 'Adult' },
    { value: 'child', label: 'Child' }
];

export default function PeopleView() {
  const { api, id: householdId, household, user: currentUser, showNotification, confirmAction, fetchHhMembers: refreshSidebar } = useOutletContext();
  const { personId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState('👤');
  
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = currentUser?.role === 'admin';

  const fetchMembersList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/households/${householdId}/members`);
      setMembers((res.data || []).filter(m => m.type !== 'pet'));
    } catch (err) {
      console.error("Failed to fetch members", err);
    } finally {
      setLoading(false);
    }
  }, [api, householdId]);

  const selectedMember = useMemo(() => 
    members.find(m => m.id === parseInt(personId)), 
  [members, personId]);

  useEffect(() => {
    if (selectedMember) {
        setSelectedEmoji(selectedMember.emoji || '👤');
    } else if (personId === 'new') {
        setSelectedEmoji('👤');
    }
  }, [selectedMember, personId]);

  useEffect(() => { fetchMembersList(); }, [fetchMembersList]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    data.emoji = selectedEmoji;

    try {
      if (personId === 'new') {
        const res = await api.post(`/households/${householdId}/members`, data);
        showNotification("Member added.", "success");
        refreshSidebar(householdId);
        navigate(`../people/${res.data.id}`);
      } else {
        await api.put(`/households/${householdId}/members/${personId}`, data);
        showNotification("Member updated.", "success");
        fetchMembersList();
        refreshSidebar(householdId);
      }
    } catch {
      showNotification("Error saving member.", "danger");
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  if (personId !== 'new' && !selectedMember) {
    return (
        <Box>
            <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography level="h2">People</Typography>
                <Typography level="body-md" color="neutral">Manage household members.</Typography>
              </Box>
              {isAdmin && <Button variant="solid" startDecorator={<Add />} onClick={() => navigate('new')}>Add Person</Button>}
            </Box>
            <Grid container spacing={2}>
                {members.map(m => (
                    <Grid xs={12} sm={6} md={4} key={m.id}>
                        <Card variant="outlined" sx={{ flexDirection: 'row', gap: 2, alignItems: 'center', cursor: 'pointer' }} onClick={() => navigate(String(m.id))}>
                            <Avatar size="lg" sx={{ bgcolor: getEmojiColor(m.emoji) }}>{m.emoji}</Avatar>
                            <Box>
                                <Typography level="title-md">{m.name}</Typography>
                                <Typography level="body-xs" sx={{ textTransform: 'capitalize' }}>{m.type}</Typography>
                            </Box>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
  }

  return (
    <Box key={personId}>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography level="h2">{personId === 'new' ? 'Add New Person' : selectedMember.name}</Typography>
        {personId !== 'new' && isAdmin && (
            <Button color="danger" variant="soft" startDecorator={<Delete />} onClick={() => confirmAction("Remove Person", "Are you sure?", () => api.delete(`/households/${householdId}/members/${personId}`).then(() => navigate('..')))}>Remove</Button>
        )}
      </Box>

      <Sheet variant="outlined" sx={{ borderRadius: 'md', minHeight: '500px', overflow: 'hidden' }}>
        {personId !== 'new' && (
            <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ bgcolor: 'transparent' }}>
                <TabList variant="plain" sx={{ p: 1, gap: 1, bgcolor: 'background.level1', mx: 2, mt: 2, borderRadius: 'md' }}>
                    <Tab variant={activeTab === 0 ? 'solid' : 'plain'} color={activeTab === 0 ? 'primary' : 'neutral'}><Info /> Details</Tab>
                    <Tab variant={activeTab === 1 ? 'solid' : 'plain'} color={activeTab === 1 ? 'primary' : 'neutral'}><Payments /> Personal Costs</Tab>
                </TabList>
            </Tabs>
        )}

        <Box sx={{ p: 4 }}>
          {(activeTab === 0 || personId === 'new') && (
            <form onSubmit={handleSubmit}>
                <Grid container spacing={3}>
                    <Grid xs={12} md={2}>
                        <IconButton onClick={() => setEmojiPickerOpen(true)} variant="outlined" sx={{ width: 80, height: 80, borderRadius: 'xl' }}>
                            <Typography level="h1">{selectedEmoji}</Typography>
                            <PhotoCamera sx={{ position: 'absolute', bottom: -5, right: -5, fontSize: '1.2rem', color: 'primary.solidBg' }} />
                        </IconButton>
                    </Grid>
                    <Grid xs={12} md={5}>
                        <FormControl required><FormLabel>Full Name</FormLabel><Input name="name" defaultValue={selectedMember?.name} /></FormControl>
                    </Grid>
                    <Grid xs={12} md={5}>
                        <AppSelect label="Role" name="type" options={MEMBER_TYPES} defaultValue={selectedMember?.type || 'adult'} required />
                    </Grid>
                    <Grid xs={12}><Button type="submit" size="lg">{personId === 'new' ? 'Create' : 'Update'}</Button></Grid>
                </Grid>
            </form>
          )}

          {activeTab === 1 && personId !== 'new' && (
            <RecurringChargesWidget 
                api={api} householdId={householdId} household={household}
                entityType="member" entityId={personId} 
                segments={[
                    { id: 'insurance', label: 'Insurance' },
                    { id: 'subscription', label: 'Subscriptions' },
                    { id: 'other', label: 'Other' }
                ]}
                title="Personal Costs"
                showNotification={showNotification}
                confirmAction={confirmAction}
            />
          )}
        </Box>
      </Sheet>
      <EmojiPicker open={emojiPickerOpen} onClose={() => setEmojiPickerOpen(false)} onEmojiSelect={(e) => { setSelectedEmoji(e); setEmojiPickerOpen(false); }} />
    </Box>
  );
}
