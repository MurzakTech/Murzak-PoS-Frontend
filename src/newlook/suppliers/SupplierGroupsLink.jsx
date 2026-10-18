import React from 'react';
import { useNavigate } from 'react-router-dom';
import Menu from '../components/Menu';
import { GROUPS_PATH } from './suppliersModel';
import T from './strings.suppliers';
import { oldScreen } from '../redirects/engine';

/**
 * The header's overflow (the three dots) with one item, Supplier groups. The Spec moves supplier groups to Settings, Advanced,
 * which is built in Phase 5; until then this opens the CURRENT supplier groups screen (/suppliers/groups) so nothing a person can do
 * today is lost. When Settings, Advanced exists, only GROUPS_PATH in suppliersModel.js changes.
 */
const SupplierGroupsLink = () => {
  const navigate = useNavigate();
  return <Menu label={T.more.label} items={[{ label: T.more.groups, onClick: () => navigate(oldScreen(GROUPS_PATH)) }]} />;
};

export default SupplierGroupsLink;
