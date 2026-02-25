import React from 'react';
import ModuleHeader from './ModuleHeader';
import { Stack, Button } from '@mui/joy';
import { Add, FileUpload } from '@mui/icons-material';

export default {
  title: 'UI/ModuleHeader',
  component: ModuleHeader,
  argTypes: {
    emoji: { control: 'text' },
    title: { control: 'text' },
    description: { control: 'text' },
  },
};

const Template = (args) => <ModuleHeader {...args} />;

export const Default = Template.bind({});
Default.args = {
  title: 'Groceries',
  description: 'Manage your weekly shopping list and track spending trends.',
  emoji: '🛒',
  chips: [
    { label: 'w/c 25th Feb', color: 'primary' },
    { label: '12 Items', color: 'neutral' },
  ],
};

export const WithActions = Template.bind({});
WithActions.args = {
  ...Default.args,
  action: (
    <Stack direction="row" spacing={1}>
      <Button variant="soft" color="neutral" startDecorator={<FileUpload />}>
        Import
      </Button>
      <Button startDecorator={<Add />}>Add Item</Button>
    </Stack>
  ),
};
