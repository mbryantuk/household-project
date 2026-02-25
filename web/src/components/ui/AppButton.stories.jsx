import React from 'react';
import AppButton from './AppButton';
import { Add, Delete, Save } from '@mui/icons-material';

export default {
  title: 'UI/AppButton',
  component: AppButton,
  argTypes: {
    variant: { control: 'select', options: ['solid', 'soft', 'outlined', 'plain'] },
    color: { control: 'select', options: ['primary', 'neutral', 'danger', 'success', 'warning'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    loading: { control: 'boolean' },
  },
};

const Template = (args) => <AppButton {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  children: 'Create Household',
  color: 'primary',
  variant: 'solid',
};

export const Success = Template.bind({});
Success.args = {
  children: 'Save Changes',
  color: 'success',
  variant: 'soft',
  startDecorator: <Save />,
};

export const Danger = Template.bind({});
Danger.args = {
  children: 'Delete Account',
  color: 'danger',
  variant: 'plain',
  startDecorator: <Delete />,
};

export const Loading = Template.bind({});
Loading.args = {
  children: 'Processing',
  loading: true,
};
