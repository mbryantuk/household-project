import { useMemo } from 'react';
import { useOutletContext, useParams, useNavigate, useLocation } from 'react-router-dom';
import { Box, Typography, CircularProgress } from '@mui/joy';
import EntityGrid from '../components/ui/EntityGrid';
import GenericObjectView from '../components/objects/GenericObjectView';

export default function PeopleView() {
  const {
    api,
    id: householdId,
    household,
    members = [],
    fetchHhMembers,
    user: currentUser,
    showNotification,
    confirmAction,
  } = useOutletContext();
  const { personId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = currentUser?.role === 'admin';

  const enabledModules = useMemo(() => {
    try {
      return household?.enabled_modules
        ? JSON.parse(household.enabled_modules)
        : ['pets', 'vehicles', 'meals'];
    } catch {
      return ['pets', 'vehicles', 'meals'];
    }
  }, [household]);

  // Derived State
  const selectedPerson = useMemo(() => {
    if (personId === 'new') return null;
    return (members || []).find((m) => m.id === parseInt(personId));
  }, [members, personId]);

  const groupedMembers = useMemo(() => {
    const groups = { adults: [], children: [], pets: [] };
    (members || []).forEach((m) => {
      if (m.type === 'pet') groups.pets.push(m);
      else if (m.type === 'child') groups.children.push(m);
      else groups.adults.push(m);
    });
    return groups;
  }, [members]);

  // Handle Default Values for New Person
  const queryParams = new URLSearchParams(location.search);
  const initialType = queryParams.get('type') || 'adult';
  const defaultValues = {
    type: initialType,
    emoji: initialType === 'child' ? '👶' : initialType === 'pet' ? '🐾' : '👨',
    first_name: '',
    middle_name: '',
    last_name: '',
    alias: '',
    dob: '',
    notes: '',
  };

  // --- LIST VIEW ---
  if (!personId) {
    const sections = [
      {
        title: 'Adults',
        items: groupedMembers.adults,
        onAdd: isAdmin ? () => navigate('new?type=adult') : null,
        addLabel: 'Add Adult',
      },
      {
        title: 'Children',
        items: groupedMembers.children,
        onAdd: isAdmin ? () => navigate('new?type=child') : null,
        addLabel: 'Add Child',
      },
    ];

    if (enabledModules.includes('pets')) {
      sections.push({
        title: 'Pets',
        items: groupedMembers.pets,
        onAdd: isAdmin ? () => navigate('new?type=pet') : null,
        addLabel: 'Add Pet',
      });
    }

    return (
      <Box data-testid="people-view">
        <Box sx={{ mb: 4 }}>
          <Typography
            level="h2"
            data-testid="people-heading"
            sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}
          >
            People & Residents
          </Typography>
          <Typography level="body-md" color="neutral">
            Select a resident to manage their details.
          </Typography>
        </Box>

        <EntityGrid
          sections={sections}
          onSelect={(person) => navigate(String(person.id))}
          renderItem={(person) => (
            <>
              <Box sx={{ fontSize: '3rem' }}>
                {person.emoji || (person.type === 'pet' ? '🐾' : '👨')}
              </Box>
              <Typography level="title-md" sx={{ fontWeight: 'lg', textAlign: 'center' }}>
                {person.alias || (person.name || '').split(' ')[0]}
              </Typography>
              <Typography level="body-xs" color="neutral" sx={{ textTransform: 'uppercase' }}>
                {person.role || person.type}
              </Typography>
            </>
          )}
        />
      </Box>
    );
  }

  // --- DETAIL VIEW ---
  const FIELDS = [
    { name: 'emoji', type: 'emoji' },
    { name: 'first_name', label: 'First Name', required: true, gridSpan: { md: 4 } },
    { name: 'middle_name', label: 'Middle Name', gridSpan: { md: 4 } },
    { name: 'last_name', label: 'Last Name', gridSpan: { md: 4 } },
    {
      name: 'type',
      label: 'Role / Type',
      type: 'select',
      options: [
        { value: 'adult', label: 'Adult' },
        { value: 'child', label: 'Child' },
        ...(enabledModules.includes('pets') ? [{ value: 'pet', label: 'Pet' }] : []),
      ],
    },
    { name: 'alias', label: 'Alias' },
    { name: 'dob', label: 'Date of Birth', type: 'date' },
    { name: 'notes', label: 'Personal Notes', gridSpan: { xs: 12 } },
  ];

  const getCostSegments = (data) => [
    ...(data?.type === 'child' ? [{ id: 'pocket_money', label: 'Pocket Money' }] : []),
    ...(data?.type === 'adult' ? [{ id: 'fun_money', label: 'Fun Money' }] : []),
    { id: 'insurance', label: 'Insurance' },
    { id: 'subscription', label: 'Subscriptions' },
    { id: 'other', label: 'Other' },
  ];

  return (
    <GenericObjectView
      key={personId} // Force remount on ID change
      type="member"
      id={personId}
      householdId={householdId}
      api={api}
      endpoint={`/households/${householdId}/members`}
      initialData={selectedPerson}
      defaultValues={defaultValues}
      fields={FIELDS}
      costSegments={getCostSegments}
      onSave={() => fetchHhMembers(householdId)}
      onDelete={() => {
        fetchHhMembers(householdId);
        navigate('..');
      }}
      onCancel={() => navigate('..')}
      scope={{ isAdmin, showNotification, confirmAction }}
      title={(data) =>
        personId === 'new'
          ? `Add New ${data.type === 'child' ? 'Child' : 'Person'}`
          : data.name || 'Person'
      }
      subtitle={
        personId === 'new'
          ? 'Enter personal details below.'
          : 'View and manage personal information.'
      }
    />
  );
}
