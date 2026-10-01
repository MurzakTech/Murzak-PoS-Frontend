import React, { useEffect } from 'react';
import { Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom';

const Sales = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Check if we're on the exact /sales route - redirect to /sales/history
  if (location.pathname === '/sales') {
    return <Navigate to="/sales/pos" replace />;
  }
  
  // Render child routes (SalesHistory, SalesInvoiceDetails, etc.)
  return <Outlet />;
};

export default Sales;

