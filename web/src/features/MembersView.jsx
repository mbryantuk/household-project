import { useState } from 'react';
import { 
  Box, Typography, Sheet, Grid, Input, FormControl, FormLabel, 
  Select, Option, Button, Chip, IconButton, Avatar, Card, CardContent, 
  Divider, Modal, ModalDialog, DialogTitle, DialogContent, DialogActions, Stack
} from '@mui/joy';
import { PersonAdd, Delete, Groups, Edit, ChildCare, Face, Visibility } from '@mui/icons-material';

const PET_SPECIES = ['Dog', 'Cat', 'Hamster', 'Rabbit', 'Bird', 'Fish', 'Reptile', 'Other'];

export default function MembersView({ members, onAddMember, onRemoveMember, onUpdateMember }) {
  const [memberType, setMemberType] = useState('adult');
  const [editMember, setEditMember] = useState(null);

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
            <Card variant="outlined" sx={{ flexDirection: 'row', alignItems: 'center', p: 2 }}>
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
                <IconButton size="sm" variant="plain" color="neutral" onClick={() => setEditMember(m)}><Edit /></IconButton>
                <IconButton size="sm" variant="plain" color="danger" onClick={() => onRemoveMember(m.id)}><Delete /></IconButton>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

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
