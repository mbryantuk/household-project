import { useState, useEffect } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
import { 
    Box, Typography, Button, Stack, Sheet, List, ListItem, 
    ListItemContent, ListItemDecorator, IconButton, Chip 
} from '@mui/joy';
import Fingerprint from '@mui/icons-material/Fingerprint';
import Delete from '@mui/icons-material/Delete';
import Add from '@mui/icons-material/Add';

export default function PasskeyManager({ api, showNotification }) {
    const [passkeys, setPasskeys] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchPasskeys();
    }, [api]);

    const fetchPasskeys = async () => {
        try {
            const res = await api.get('/auth/passkeys');
            setPasskeys(res.data);
        } catch (err) {
            console.error("Failed to fetch passkeys", err);
        }
    };

    const handleRegister = async () => {
        setLoading(true);
        try {
            // 1. Get options from server
            const optionsRes = await api.get('/passkeys/register/options');
            const options = optionsRes.data;

            // 2. Start registration with browser
            const attestation = await startRegistration(options);

            // 3. Verify with server
            await api.post('/passkeys/register/verify', attestation);
            
            showNotification('Passkey added successfully!', 'success');
            fetchPasskeys();
        } catch (err) {
            console.error(err);
            showNotification(err.response?.data?.error || err.message || 'Passkey registration failed.', 'danger');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Remove this passkey? You won't be able to use it to login.")) return;
        try {
            await api.delete(`/passkeys/${id}`);
            setPasskeys(prev => prev.filter(pk => pk.id !== id));
            showNotification('Passkey removed.', 'success');
        } catch (err) {
            showNotification('Failed to remove passkey.', 'danger');
        }
    };

    return (
        <Sheet variant="outlined" sx={{ p: 3, borderRadius: 'md', bgcolor: 'background.level1' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Box>
                    <Typography level="title-md" startDecorator={<Fingerprint color="primary" />}>Passkeys</Typography>
                    <Typography level="body-xs" color="neutral" sx={{ mt: 0.5 }}>
                        Sign in securely with FaceID, TouchID, or a hardware key.
                    </Typography>
                </Box>
                <Button 
                    variant="solid" 
                    color="primary" 
                    startDecorator={<Add />} 
                    onClick={handleRegister}
                    loading={loading}
                >
                    Add Passkey
                </Button>
            </Stack>

            <List sx={{ '--ListItem-paddingY': '12px' }}>
                {passkeys.map((pk, idx) => (
                    <ListItem key={pk.id} sx={{ borderBottom: idx < passkeys.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                        <ListItemDecorator>
                            <Fingerprint sx={{ opacity: 0.5 }} />
                        </ListItemDecorator>
                        <ListItemContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography level="title-sm">Passkey ({pk.device_type || 'Unknown'})</Typography>
                                <Chip size="sm" variant="soft" color="neutral">{new Date(pk.created_at).toLocaleDateString()}</Chip>
                            </Box>
                            <Typography level="body-xs" color="neutral">
                                Last used: {pk.last_used_at ? new Date(pk.last_used_at).toLocaleString() : 'Never'}
                            </Typography>
                        </ListItemContent>
                        <IconButton size="sm" color="danger" variant="plain" onClick={() => handleDelete(pk.id)}>
                            <Delete />
                        </IconButton>
                    </ListItem>
                ))}
                {passkeys.length === 0 && (
                    <Typography level="body-sm" sx={{ p: 2, textAlign: 'center', opacity: 0.5 }}>
                        No passkeys registered.
                    </Typography>
                )}
            </List>
        </Sheet>
    );
}
