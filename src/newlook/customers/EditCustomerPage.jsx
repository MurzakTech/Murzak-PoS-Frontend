import React from 'react';
import { useParams } from 'react-router-dom';
import CustomerForm from './CustomerForm';

/** The Edit customer form at /new-look/customers/:id/edit (ticket P4-7): the same fields as New, plus Disabled */
const EditCustomerPage = () => {
  const { id } = useParams();
  return <CustomerForm mode="edit" id={id} />;
};

export default EditCustomerPage;
