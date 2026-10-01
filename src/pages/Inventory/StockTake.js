import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Container,
  IconButton,
  Alert,
} from '@mui/material';
import {
  ArrowBack,
} from '@mui/icons-material';
import { useStockReconciliationByRole } from '../../hooks/useStockReconciliationByRole';
import StockTakeForm from '../../components/StockReconciliation/StockTakeForm';

/**
 * Stock Take Page
 * Dedicated page for adding stock take to a reconciliation
 */
const StockTake = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canAddStockTake, reconciliation, userRole, roleLabel } = useStockReconciliationByRole();

  const handleSuccess = () => {
    // Navigate back to details page after successful stock take
    navigate(`/inventory/multi-level-reconciliation/${id}`);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton
            onClick={() => navigate(`/inventory/multi-level-reconciliation/${id}`)}
            sx={{ mr: 2 }}
          >
            <ArrowBack />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h4" component="h1">
              Add Stock Take
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Reconciliation: {id}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Role: {roleLabel}
            </Typography>
          </Box>
        </Box>

        {/* Permission Check */}
        {!canAddStockTake && reconciliation && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            You cannot add stock take at the current workflow stage. Current status: {reconciliation.workflow_state}
            {reconciliation.workflow_state === 'Completed' && ' (Reconciliation is completed)'}
          </Alert>
        )}

        {/* Stock Take Form */}
        <StockTakeForm
          reconciliationName={id}
          onSuccess={handleSuccess}
        />
      </Box>
    </Container>
  );
};

export default StockTake;

