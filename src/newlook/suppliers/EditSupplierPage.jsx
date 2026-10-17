import React from 'react';
import { useParams } from 'react-router-dom';
import SupplierForm from './SupplierForm';

/** The Edit supplier form at /new-look/suppliers/:id/edit (ticket P4-6): the same fields as New, plus Enabled */
const EditSupplierPage = () => {
  const { id } = useParams();
  return <SupplierForm mode="edit" id={id} />;
};

export default EditSupplierPage;
