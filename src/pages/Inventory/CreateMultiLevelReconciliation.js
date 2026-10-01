import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Container,
  IconButton,
} from '@mui/material';
import {
  ArrowBack,
} from '@mui/icons-material';
import { useStockReconciliationByRole } from '../../hooks/useStockReconciliationByRole';
import CreateReconciliation from '../../components/StockReconciliation/CreateReconciliation';

/**
 * Create Multi-Level Stock Reconciliation Page
 * Page for creating a new multi-level stock reconciliation
 */
const CreateMultiLevelReconciliation = () => {
  const navigate = useNavigate();
  const { userRole } = useStockReconciliationByRole();

  const handleSuccess = (reconciliationName) => {
    // After creation, workflow state is "Pending Sales User"
    // If current user is Sales User, navigate directly to stock take page
    // Otherwise, navigate to details page
    if (userRole === 'Sales User') {
      // New reconciliation always starts with "Pending Sales User" status
      navigate(`/inventory/multi-level-reconciliation/${reconciliationName}/stock-take`);
    } else {
      navigate(`/inventory/multi-level-reconciliation/${reconciliationName}`);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton
            onClick={() => navigate('/inventory/multi-level-reconciliation')}
            sx={{ mr: 2 }}
          >
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" component="h1">
            Create Multi-Level Stock Reconciliation
          </Typography>
        </Box>

        {/* Create Form */}
        <CreateReconciliation onSuccess={handleSuccess} />
      </Box>
    </Container>
  );
};

export default CreateMultiLevelReconciliation;

