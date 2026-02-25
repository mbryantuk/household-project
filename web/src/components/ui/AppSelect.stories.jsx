import React from 'react';
import AppSelect from './AppSelect';
import { Option } from '@mui/joy';

export default {
  title: 'UI/AppSelect',
  component: AppSelect,
  argTypes: {
    color: { control: 'select', options: ['primary', 'neutral', 'danger', 'success', 'warning'] },
    variant: { control: 'select', options: ['solid', 'soft', 'outlined', 'plain'] },
  },
};

const Template = (args) => (
  <AppSelect {...args} sx={{ width: 240 }}>
    <Option value="1">Option 1</Option>
    <Option value="2">Option 2</Option>
    <Option value="3">Option 3</Option>
  </AppSelect>
);

export const Default = Template.bind({});
Default.args = {
  placeholder: 'Select a frequency...',
};

export const Soft = Template.bind({});
Soft.args = {
  variant: 'soft',
  color: 'primary',
  defaultValue: '1',
};
