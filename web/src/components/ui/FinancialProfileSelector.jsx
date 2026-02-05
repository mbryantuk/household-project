import React, { useState, useEffect } from 'react';
import { FormControl, FormLabel, Select, Option, Box, Avatar, Typography, IconButton, Modal, ModalDialog, DialogTitle, DialogContent, DialogActions, Button, Input } from '@mui/joy';
import { useOutletContext } from 'react-router-dom';
import { Add } from '@mui/icons-material';
import EmojiPicker from '../EmojiPicker';
import { getEmojiColor } from '../../theme';

export default function FinancialProfileSelector({ value, onChange, profiles: externalProfiles, onProfileCreated, required = false, label = "Financial Profile" }) {
    const { api, id: householdId, isDark } = useOutletContext();
    const [internalProfiles, setInternalProfiles] = useState([]);
    const [loading, setLoading] = useState(!externalProfiles);
    
    // Create Modal State
    const [openCreate, setOpenCreate] = useState(false);
    const [emoji, setEmoji] = useState('💰');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    const profiles = externalProfiles || internalProfiles;

    useEffect(() => {
        if (externalProfiles) {
            setLoading(false);
            return;
        }
        if (!householdId) return;
        const fetchProfiles = async () => {
            try {
                const res = await api.get(`/households/${householdId}/finance/profiles`);
                setInternalProfiles(res.data || []);
                if (!value && res.data.length > 0) {
                    const def = res.data.find(p => p.is_default) || res.data[0];
                    if (onChange) onChange(def.id);
                }
            } catch (err) {
                console.error("Failed to fetch finance profiles", err);
            } finally {
                setLoading(false);
            }
        };
        fetchProfiles();
    }, [api, householdId, externalProfiles, value, onChange]);

    const handleCreate = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const payload = {
            name: formData.get('name'),
            emoji: emoji,
            is_default: false
        };

        try {
            const res = await api.post(`/households/${householdId}/finance/profiles`, payload);
            const newProfile = res.data;
            
            if (externalProfiles) {
                if (onProfileCreated) onProfileCreated(newProfile);
            } else {
                setInternalProfiles(prev => [...prev, newProfile]);
                if (onChange) onChange(newProfile.id);
            }
            setOpenCreate(false);
            setEmoji('💰');
        } catch (err) {
            console.error("Failed to create profile", err);
            alert("Failed to create profile");
        }
    };

    return (
        <FormControl required={required}>
            {label && <FormLabel>{label}</FormLabel>}
            <Box sx={{ display: 'flex', gap: 1 }}>
                <Select 
                    value={value} 
                    onChange={(e, val) => onChange && onChange(val)}
                    placeholder={loading ? "Loading..." : "Select Profile"}
                    disabled={loading}
                    startDecorator={
                        value ? <Box sx={{ fontSize: '1.2rem' }}>{profiles.find(p => p.id === value)?.emoji}</Box> : null
                    }
                    sx={{ flexGrow: 1 }}
                >
                    {profiles.map(p => (
                        <Option key={p.id} value={p.id}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography level="body-sm">{p.name}</Typography>
                                {p.is_default === 1 && <Typography level="body-xs" color="neutral">(Default)</Typography>}
                            </Box>
                        </Option>
                    ))}
                </Select>
                <IconButton variant="outlined" onClick={() => setOpenCreate(true)}>
                    <Add />
                </IconButton>
            </Box>

            <Modal open={openCreate} onClose={() => setOpenCreate(false)}>
                <ModalDialog>
                    <DialogTitle>Create Financial Profile</DialogTitle>
                    <DialogContent>
                        <form onSubmit={handleCreate}>
                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, mt: 2 }}>
                                <IconButton 
                                    onClick={() => setShowEmojiPicker(true)}
                                    variant="outlined"
                                    sx={{ 
                                        width: 48, height: 48, fontSize: '1.5rem',
                                        bgcolor: getEmojiColor(emoji, isDark)
                                    }}
                                >
                                    {emoji}
                                </IconButton>
                                <FormControl sx={{ flexGrow: 1 }} required>
                                    <FormLabel>Profile Name</FormLabel>
                                    <Input name="name" placeholder="e.g. Joint Account..." autoFocus />
                                </FormControl>
                            </Box>
                            <DialogActions>
                                <Button variant="plain" color="neutral" onClick={() => setOpenCreate(false)}>Cancel</Button>
                                <Button type="submit">Create</Button>
                            </DialogActions>
                        </form>
                    </DialogContent>
                </ModalDialog>
            </Modal>

            <EmojiPicker 
                open={showEmojiPicker} 
                onClose={() => setShowEmojiPicker(false)} 
                onEmojiSelect={(e) => { setEmoji(e); setShowEmojiPicker(false); }}
                isDark={isDark}
            />
        </FormControl>
    );
}
