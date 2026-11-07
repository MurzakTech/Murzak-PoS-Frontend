import React from 'react';
import { render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CustomerDialog from './CustomerDialog';

const Harness = ({ customers, showAddForm = false }) => {
  const { control, handleSubmit, formState: { errors } } = useForm({ defaultValues: { customer_name: '', mobile_no: '', email_id: '', customer_type: 'Individual' } });
  return (
    <ThemeProvider theme={createTheme()}>
    <CustomerDialog
      open
      onClose={() => {}}
      showAddForm={showAddForm}
      setShowAddForm={() => {}}
      resetForm={() => {}}
      handleFormSubmit={handleSubmit}
      onCreate={() => {}}
      formControl={control}
      formErrors={errors}
      isCreating={false}
      searchTerm=""
      setSearchTerm={() => {}}
      customers={customers}
      isLoading={false}
      onSelect={() => {}}
      currency="KES"
    />
    </ThemeProvider>
  );
};

test('a saved customer called Walk-in is not listed again beside the permanent Walk-in customer entry', () => {
  render(<Harness customers={[{ name: 'CUST-1', customer_name: 'Walk-in Customer' }, { name: 'CUST-2', customer_name: 'Amina' }]} />);
  expect(screen.getAllByText(/walk-in customer/i)).toHaveLength(1);
  expect(screen.getByText('Amina')).toBeInTheDocument();
});

test('the list still says nothing matches when only a Walk-in record is left', () => {
  render(<Harness customers={[{ name: 'CUST-1', customer_name: 'Walk-in' }]} />);
  expect(screen.getByText('No customers match.')).toBeInTheDocument();
});
