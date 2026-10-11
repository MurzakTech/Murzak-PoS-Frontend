import React, { useEffect } from 'react';
import { Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom';

const Sales = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // The Sales area opens on Sales History; the till has its own address, /sales/pos
  if (location.pathname === '/sales') {
    return <Navigate to="/sales/history" replace />;
  }
  
  // Render child routes (SalesHistory, SalesInvoiceDetails, etc.)
  return <Outlet />;
};

export default Sales;

