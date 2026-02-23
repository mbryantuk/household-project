import React from 'react';
import { Card, Box, Avatar, Typography, IconButton, Divider, AvatarGroup } from '@mui/joy';
import { Add, Remove, Edit, GroupAdd, Delete } from '@mui/icons-material';
import { getEmojiColor } from '../../utils/colors';

export default function FinanceCard({
  title,
  subtitle,
  emoji = '💰',
  isDark,
  balance,
  balanceColor = 'success', // 'success', 'danger', 'neutral'
  currency = 'GBP',
  subValue, // e.g. "4.5% AER"
  onEdit,
  onDelete,
  onAddFunds,
  onRemoveFunds,
  assignees = [],
  onAssign, // function to trigger assignment modal/popover
  extraActions, // ReactNode (buttons like "Add Pot")
  children,
}) {
  const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    let code =
      currency === '£' ? 'GBP' : currency === '$' ? 'USD' : currency === '€' ? 'EUR' : currency;
    try {
      return num.toLocaleString('en-GB', {
        style: 'currency',
        currency: code,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    } catch {
      return `${code} ${num.toFixed(2)}`;
    }
  };

  return (
    <Card
      variant="outlined"
      sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}
    >
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        <Avatar size="lg" sx={{ bgcolor: getEmojiColor(emoji, isDark) }}>
          {emoji}
        </Avatar>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography level="title-lg" noWrap>
            {title}
          </Typography>
          <Typography level="body-sm" noWrap>
            {subtitle}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography level="h3" color={balanceColor}>
            {formatCurrency(balance)}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end', mb: 0.5 }}>
            {onRemoveFunds && (
              <IconButton size="sm" variant="soft" color="danger" onClick={onRemoveFunds}>
                <Remove fontSize="small" />
              </IconButton>
            )}
            {onAddFunds && (
              <IconButton size="sm" variant="soft" color="success" onClick={onAddFunds}>
                <Add fontSize="small" />
              </IconButton>
            )}
          </Box>
          {subValue &&
            (typeof subValue === 'string' || typeof subValue === 'number' ? (
              <Typography level="body-xs" color="neutral">
                {subValue}
              </Typography>
            ) : (
              subValue
            ))}
        </Box>
      </Box>

      <Divider />

      <Box sx={{ flexGrow: 1 }}>{children}</Box>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mt: 'auto',
          pt: 2,
        }}
      >
        <AvatarGroup size="sm" sx={{ '--AvatarGroup-gap': '-8px' }}>
          {assignees.map((m) => (
            <Avatar key={m.id} sx={{ bgcolor: getEmojiColor(m.emoji, isDark) }}>
              {m.emoji}
            </Avatar>
          ))}
          {onAssign && (
            <IconButton size="sm" onClick={onAssign} sx={{ borderRadius: '50%' }}>
              <GroupAdd />
            </IconButton>
          )}
        </AvatarGroup>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {extraActions}
          {onEdit && (
            <IconButton size="sm" onClick={onEdit}>
              <Edit />
            </IconButton>
          )}
          {onDelete && (
            <IconButton size="sm" color="danger" onClick={onDelete}>
              <Delete />
            </IconButton>
          )}
        </Box>
      </Box>
    </Card>
  );
}
