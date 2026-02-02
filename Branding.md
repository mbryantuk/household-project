# BRANDING GUIDELINES: TOTEM Household SaaS

## 1. Typography Standards

All typography MUST use MUI Joy UI `<Typography />` components with defined `level` props.

| Level | Usage | Weight | Size (Fixed) |
| :--- | :--- | :--- | :--- |
| `h1` | Registration/Login Page Titles | `xl` (800) | `2.25rem` (36px) |
| `h2` | Page Headers / Tabbed View Headers | `lg` (700) | `1.5rem` (24px) |
| `h3` | Section Headers (Inside Cards/Modals) | `md` (600) | `1.25rem` (20px) |
| `h4` | Sub-section Labels | `md` (600) | `1.125rem` (18px) |
| `title-lg` | Primary List Item / Modal Titles | `lg` (700) | `1.125rem` (18px) |
| `title-md` | Secondary List Item Titles | `md` (600) | `1rem` (16px) |
| `body-md` | Standard Body Text (Default) | `normal` (400) | `1rem` (16px) |
| `body-sm` | Captions / Descriptions | `normal` (400) | `0.875rem` (14px) |
| `body-xs` | Overlines / Meta Data | `normal` (400) | `0.75rem` (12px) |

## 2. Header Structure (NON-NEGOTIABLE)

Every view and every major tabbed section MUST follow this exact structure:

```jsx
<Box sx={{ mb: 4 }}>
  <Typography level="h2" sx={{ fontWeight: 'lg', mb: 0.5, fontSize: '1.5rem' }}>{Title}</Typography>
  <Typography level="body-md" color="neutral">{Description}</Typography>
</Box>
```

## 4. Gold Standard Modal Pattern (Top-Left Avatar)

All data entry/editing modals MUST follow this structure to ensure consistency and mobile responsiveness.

**Structure:**
1.  **Header:** Flex row containing the Avatar (EmojiPicker trigger) on the left, and Title/Description on the right.
2.  **Avatar:** Large (`lg`), interactive, with an absolute positioned 'Edit' badge.
3.  **Content:** `DialogContent` with `overflowX: 'hidden'` to prevent Grid negative margin scrollbars.
4.  **Container:** `ModalDialog` with `maxHeight: '95vh'`, `overflowY: 'auto'`, and appropriate `maxWidth`.

**Example:**
```jsx
<Modal open={open} onClose={onClose}>
  <ModalDialog sx={{ maxWidth: 500, width: '100%', maxHeight: '95vh', overflowY: 'auto' }}>
    <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'flex-start' }}>
        <Box sx={{ position: 'relative' }}>
            <Avatar size="lg" sx={{ '--Avatar-size': '64px', bgcolor: getEmojiColor(emoji, isDark), fontSize: '2rem', cursor: 'pointer' }} onClick={() => setPickerOpen(true)}>{emoji}</Avatar>
            <IconButton size="sm" variant="solid" color="primary" sx={{ position: 'absolute', bottom: -4, right: -4, borderRadius: '50%', border: '2px solid', borderColor: 'background.surface' }} onClick={() => setPickerOpen(true)}><Edit sx={{ fontSize: '0.8rem' }} /></IconButton>
        </Box>
        <Box sx={{ flexGrow: 1 }}>
            <DialogTitle>{title}</DialogTitle>
            <Typography level="body-sm" color="neutral">{description}</Typography>
        </Box>
    </Box>
    <DialogContent sx={{ overflowX: 'hidden' }}>
        {/* Form Content */}
    </DialogContent>
  </ModalDialog>
</Modal>
```
