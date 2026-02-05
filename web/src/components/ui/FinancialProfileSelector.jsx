import React, { useState, useEffect } from 'react';
import { FormControl, FormLabel, Select, Option, Box, Avatar, Typography } from '@mui/joy';
import { useOutletContext } from 'react-router-dom';

export default function FinancialProfileSelector({ value, onChange, required = false, label = "Financial Profile" }) {
    const { api, id: householdId } = useOutletContext();
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!householdId) return;
        const fetchProfiles = async () => {
            try {
                const res = await api.get(`/households/${householdId}/finance/profiles`);
                setProfiles(res.data || []);
                // If value is not set and profiles exist, check for default
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
    }, [api, householdId]);

    return (
        <FormControl required={required}>
            <FormLabel>{label}</FormLabel>
            <Select 
                value={value} 
                onChange={(e, val) => onChange && onChange(val)}
                placeholder={loading ? "Loading..." : "Select Profile"}
                disabled={loading || profiles.length === 0}
            >
                {profiles.map(p => (
                    <Option key={p.id} value={p.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar size="sm" sx={{ width: 20, height: 20, fontSize: '12px', bgcolor: 'transparent' }}>{p.emoji}</Avatar>
                            <Typography level="body-sm">{p.name}</Typography>
                            {p.is_default === 1 && <Typography level="body-xs" color="neutral">(Default)</Typography>}
                        </Box>
                    </Option>
                ))}
            </Select>
        </FormControl>
    );
}
