import { useState } from 'react';
import { 
  Box, Typography, Sheet, Grid, Input, FormControl, FormLabel, 
  Select, Option, Button, Chip, IconButton, Avatar, Card, CardContent, 
  Divider, Modal, ModalDialog, DialogTitle, DialogContent, DialogActions, Stack, Tabs, TabList, Tab
} from '@mui/joy';
import { PersonAdd, Delete, Groups, Edit, ChildCare, Face, Visibility, Payments, Info } from '@mui/icons-material';
import RecurringChargesWidget from '../components/ui/RecurringChargesWidget';
import { useOutletContext } from 'react-router-dom';

const PET_SPECIES = ['Dog', 'Cat', 'Hamster', 'Rabbit', 'Bird', 'Fish', 'Reptile', 'Other'];

export default function MembersView({ members, onAddMember, onRemoveMember, onUpdateMember }) {
  const { api, id: householdId, household, showNotification, confirmAction } = useOutletContext();
  const [memberType, setMemberType] = useState('adult');
  const [editMember, setEditMember] = useState(null);
  const [viewMember, setViewMember] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

  const getResidentAvatar = (m) => {
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

  const getMemberSegments = (type) => {
    if (type === 'pet') {
        return [
          { id: 'food', label: 'Food & Supplies' },
          { id: 'insurance', label: 'Pet Insurance' },
          { id: 'vet', label: 'Vet & Medical' },
          { id: 'other', label: 'Other' }
        ];
    }

    const base = [
        { id: 'subscription', label: 'Subscriptions' },
        { id: 'insurance', label: 'Insurance' },
        { id: 'education', label: 'Education' },
        { id: 'care', label: 'Care & Support' },
        { id: 'other', label: 'Other' }
    ];

    if (type === 'child') {
        return [{ id: 'pocket_money', label: 'Pocket Money' }, ...base];
    }
    
    // Adult / Viewer
    return [{ id: 'fun_money', label: 'Fun Money' }, ...base];
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    onUpdateMember(editMember.id, Object.fromEntries(formData.entries()));
    setEditMember(null);
  };

  return (
    <Box>
      <Box sx={{ 
          mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
          flexWrap: 'wrap', gap: 2 
      }}>
        <Box>
          <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: { xs: '1.5rem', md: '2rem' } }}>
            Household Residents
          </Typography>
          <Typography level="body-md" color="neutral">
            Manage family members and pets.
          </Typography>
        </Box>
      </Box>

      <Sheet variant="outlined" sx={{ p: 3, borderRadius: 'md' }}>
      
      {/* ADD FORM */}
      <Sheet variant="soft" sx={{ mb: 4, p: 3, borderRadius: 'sm' }}>
        <form onSubmit={onAddMember}>
            <Grid container spacing={2} alignItems="flex-end">
              <Grid xs={12} sm={4}>
                <FormControl size="sm">
                  <FormLabel>Type</FormLabel>
                  <Select name="type" value={memberType} onChange={(e, v) => setMemberType(v)}>
                    <Option value="adult">Adult</Option>
                    <Option value="child">Child</Option>
                    <Option value="viewer">Viewer</Option>
                    <Option value="pet">Pet</Option>
                  </Select>
                </FormControl>
              </Grid>
              <Grid xs={12} sm={8}>
                  <FormControl size="sm" required>
                    <FormLabel>Full Name</FormLabel>
                    <Input name="name" />
                  </FormControl>
              </Grid>
              {memberType !== 'pet' ? (
                <>
                  <Grid xs={12} sm={4}>
                      <FormControl size="sm">
                        <FormLabel>Alias</FormLabel>
                        <Input name="alias" />
                      </FormControl>
                  </Grid>
                  <Grid xs={12} sm={4}>
                      <FormControl size="sm">
                        <FormLabel>DOB</FormLabel>
                        <Input name="dob" type="date" />
                      </FormControl>
                  </Grid>
                  <Grid xs={12} sm={4}>
                    <FormControl size="sm">
                      <FormLabel>Gender</FormLabel>
                      <Select name="gender" defaultValue="none">
                        <Option value="none">Not Specified</Option>
                        <Option value="male">Male</Option>
                        <Option value="female">Female</Option>
                      </Select>
                    </FormControl>
                  </Grid>
                </>
              ) : (
                <Grid xs={12} sm={12}>
                  <FormControl size="sm">
                    <FormLabel>Species</FormLabel>
                    <Select name="species" defaultValue="Dog">
                        {PET_SPECIES.map(s => <Option key={s} value={s}>{s}</Option>)}
                    </Select>
                  </FormControl>
                </Grid>
              )}
              <Grid xs={12}>
                  <Button type="submit" variant="solid" fullWidth startDecorator={<PersonAdd />}>Add Resident</Button>
              </Grid>
            </Grid>
        </form>
      </Sheet>

      {/* LIST */}
      <Grid container spacing={2}>
        {members.map((m) => (
          <Grid xs={12} sm={6} md={4} key={m.id}>
            <Card 
                variant="outlined" 
                sx={{ flexDirection: 'row', alignItems: 'center', p: 2, cursor: 'pointer', '&:hover': { bgcolor: 'background.level1' } }} 
                onClick={() => { setViewMember(m); setActiveTab(0); }}
            >
              <Avatar size="lg" sx={{ bgcolor: m.type === 'pet' ? 'warning.softBg' : 'primary.softBg' }}>
                {getResidentAvatar(m)}
              </Avatar>
              <CardContent>
                <Typography level="title-md">{m.name || 'Unnamed Resident'}</Typography>
                <Typography level="body-sm">
                    {m.alias ? `"${m.alias}"` : (m.type ? m.type.toUpperCase() : 'RESIDENT')}
                </Typography>
              </CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <IconButton size="sm" variant="plain" color="neutral" onClick={(e) => { e.stopPropagation(); setEditMember(m); }}><Edit /></IconButton>
                <IconButton size="sm" variant="plain" color="danger" onClick={(e) => { e.stopPropagation(); onRemoveMember(m.id); }}><Delete /></IconButton>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* VIEW MODAL (Member Details & Costs) */}
      <Modal open={Boolean(viewMember)} onClose={() => setViewMember(null)}>
        <ModalDialog sx={{ maxWidth: 600, width: '100%', p: 0, overflow: 'hidden' }}>
            {viewMember && (
                <>
                    <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'background.level1' }}>
                        <Avatar size="lg">{getResidentAvatar(viewMember)}</Avatar>
                        <Box>
                            <Typography level="h3">{viewMember.name}</Typography>
                            <Typography level="body-sm" color="neutral">{viewMember.type.toUpperCase()} • {viewMember.alias || 'No Alias'}</Typography>
                        </Box>
                    </Box>
                    <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
                        <TabList variant="plain" sx={{ px: 2, bgcolor: 'background.level1' }}>
                            <Tab value={0} variant={activeTab === 0 ? 'solid' : 'plain'} color={activeTab === 0 ? 'primary' : 'neutral'}><Info sx={{ mr: 1 }} /> Details</Tab>
                            <Tab value={1} variant={activeTab === 1 ? 'solid' : 'plain'} color={activeTab === 1 ? 'primary' : 'neutral'}><Payments sx={{ mr: 1 }} /> Recurring Costs</Tab>
                        </TabList>
                        <Box sx={{ p: 3, minHeight: 300 }}>
                            {activeTab === 0 && (
                                <Grid container spacing={2}>
                                    <Grid xs={6}><Typography level="body-xs" fontWeight="bold">TYPE</Typography><Typography level="body-sm">{viewMember.type}</Typography></Grid>
                                    <Grid xs={6}><Typography level="body-xs" fontWeight="bold">GENDER</Typography><Typography level="body-sm">{viewMember.gender || 'Not Specified'}</Typography></Grid>
                                    <Grid xs={6}><Typography level="body-xs" fontWeight="bold">DOB</Typography><Typography level="body-sm">{viewMember.dob || 'Not Recorded'}</Typography></Grid>
                                    {viewMember.type === 'pet' && <Grid xs={6}><Typography level="body-xs" fontWeight="bold">SPECIES</Typography><Typography level="body-sm">{viewMember.species}</Typography></Grid>}
                                </Grid>
                            )}
                            {activeTab === 1 && (
                                <RecurringChargesWidget 
                                    api={api} 
                                    householdId={householdId} 
                                    household={household}
                                    entityType={viewMember.type === 'pet' ? 'pet' : 'member'} 
                                    entityId={viewMember.id} 
                                    title="Recurring Costs"
                                    segments={getMemberSegments(viewMember.type)}
                                    showNotification={showNotification} 
                                    confirmAction={confirmAction}
                                />
                            )}
                        </Box>
                    </Tabs>
                    <Divider />
                    <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button variant="plain" color="neutral" onClick={() => setViewMember(null)}>Close</Button>
                    </Box>
                </>
            )}
        </ModalDialog>
      </Modal>

      {/* EDIT MODAL */}
      <Modal open={Boolean(editMember)} onClose={() => setEditMember(null)}>
        <ModalDialog sx={{ maxWidth: 500, width: '100%' }}>
            <DialogTitle>Edit Resident</DialogTitle>
            <DialogContent>
                <form onSubmit={handleEditSubmit}>
                    <Stack spacing={2} mt={1}>
                        <Grid container spacing={2}>
                          <Grid xs={12} sm={6}>
                            <FormControl size="sm">
                                <FormLabel>Type</FormLabel>
                                <Select name="type" defaultValue={editMember?.type}>
                                    <Option value="adult">Adult</Option>
                                    <Option value="child">Child</Option>
                                    <Option value="viewer">Viewer</Option>
                                    <Option value="pet">Pet</Option>
                                </Select>
                            </FormControl>
                          </Grid>
                          <Grid xs={12} sm={6}>
                              <FormControl size="sm" required>
                                <FormLabel>Name</FormLabel>
                                <Input name="name" defaultValue={editMember?.name} />
                              </FormControl>
                          </Grid>
                          <Grid xs={12} sm={6}>
                              <FormControl size="sm">
                                <FormLabel>Alias</FormLabel>
                                <Input name="alias" defaultValue={editMember?.alias} />
                              </FormControl>
                          </Grid>
                          <Grid xs={12} sm={6}>
                              <FormControl size="sm">
                                <FormLabel>DOB</FormLabel>
                                <Input name="dob" type="date" defaultValue={editMember?.dob} />
                              </FormControl>
                          </Grid>
                          <Grid xs={12} sm={6}>
                             <FormControl size="sm">
                                <FormLabel>Gender</FormLabel>
                                <Select name="gender" defaultValue={editMember?.gender || 'none'}>
                                    <Option value="none">None</Option>
                                    <Option value="male">Male</Option>
                                    <Option value="female">Female</Option>
                                </Select>
                            </FormControl>
                          </Grid>
                          <Grid xs={12} sm={6}>
                            <FormControl size="sm">
                                <FormLabel>Species</FormLabel>
                                <Select name="species" defaultValue={editMember?.species || 'Dog'}>
                                    {PET_SPECIES.map(s => <Option key={s} value={s}>{s}</Option>)}
                                </Select>
                            </FormControl>
                          </Grid>
                        </Grid>
                        <DialogActions>
                            <Button variant="plain" color="neutral" onClick={() => setEditMember(null)}>Cancel</Button>
                            <Button type="submit" variant="solid">Save</Button>
                        </DialogActions>
                    </Stack>
                </form>
            </DialogContent>
        </ModalDialog>
      </Modal>
    </Sheet>
    </Box>
  );
}
