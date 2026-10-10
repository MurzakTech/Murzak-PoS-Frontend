import React, { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Container,
  CircularProgress,
  IconButton,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Chip,
} from '@mui/material';
import {
  ArrowBack,
  Inventory2,
  Refresh,
  CheckCircle,
} from '@mui/icons-material';
import { useStockReconciliation } from '../../hooks/useStockReconciliation';
import { useStockReconciliationByRole } from '../../hooks/useStockReconciliationByRole';
import ReconciliationView from '../../components/StockReconciliation/ReconciliationView';
import WorkflowStatusBadge from '../../components/StockReconciliation/WorkflowStatusBadge';

/**
 * Multi-Level Stock Reconciliation Details Page
 * Shows full reconciliation details with role-based actions
 */
const MultiLevelReconciliationDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getReconciliation, reconciliation, loading, error, refetchReconciliation } = useStockReconciliation();
  const { canAddStockTake, userRole, roleLabel } = useStockReconciliationByRole();


  useEffect(() => {
    if (id) {
      getReconciliation(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]); // Only depend on id, getReconciliation is stable from useCallback

  // Workflow steps
  const workflowSteps = useMemo(() => [
    { label: 'Create Reconciliation', status: 'completed' },
    { label: 'Sales User Stock Take', status: 'pending' },
    { label: 'Quality Manager Stock Take', status: 'pending' },
    { label: 'Stock Manager Stock Take & Submit', status: 'pending' },
  ], []);

  // Determine current step and next action
  const workflowInfo = useMemo(() => {
    if (!reconciliation) return null;

    const currentStatus = reconciliation.workflow_state;
    let activeStep = 0;
    let nextAction = null;
    let nextRole = null;

    switch (currentStatus) {
      case 'Pending Sales User':
        activeStep = 1;
        nextAction = 'Sales User needs to add stock take';
        nextRole = 'Sales User';
        break;
      case 'Pending Quality Manager':
        activeStep = 2;
        nextAction = 'Quality Manager needs to add stock take';
        nextRole = 'Quality Manager';
        break;
      case 'Pending Stock Manager':
        activeStep = 3;
        nextAction = 'Stock Manager needs to add stock take and submit';
        nextRole = 'Stock Manager';
        break;
      case 'Completed':
        activeStep = 4;
        nextAction = 'Reconciliation completed';
        break;
      default:
        activeStep = 0;
    }

    return { activeStep, nextAction, nextRole, currentStatus };
  }, [reconciliation]);

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ py: 4 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
          <Button startIcon={<ArrowBack />} onClick={() => navigate('/inventory/multi-level-reconciliation')}>
            Back to List
          </Button>
        </Box>
      </Container>
    );
  }

  if (!reconciliation) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ py: 4 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            Reconciliation not found
          </Alert>
          <Button startIcon={<ArrowBack />} onClick={() => navigate('/inventory/multi-level-reconciliation')}>
            Back to List
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={() => navigate('/inventory/multi-level-reconciliation')} sx={{ mr: 2 }}>
            <ArrowBack />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h4" component="h1">
              Reconciliation Details
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {reconciliation.name}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={() => refetchReconciliation()}
              disabled={loading}
            >
              Refresh
            </Button>
            {canAddStockTake && reconciliation.workflow_state !== 'Completed' && (
              <Button
                variant="contained"
                startIcon={<Inventory2 />}
                onClick={() => navigate(`/inventory/multi-level-reconciliation/${id}/stock-take`)}
                size="large"
              >
                Add Stock Take ({roleLabel})
              </Button>
            )}
          </Box>
        </Box>

        {/* Workflow Progress */}
        {workflowInfo && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Workflow Progress
            </Typography>
            <Box sx={{ mb: 2 }}>
              <WorkflowStatusBadge status={reconciliation.workflow_state} />
            </Box>
            <Stepper activeStep={workflowInfo.activeStep} alternativeLabel>
              {workflowSteps.map((step, index) => {
                const isCompleted = index < workflowInfo.activeStep;
                const isCurrent = index === workflowInfo.activeStep - 1;
                const isPending = index >= workflowInfo.activeStep;

                return (
                  <Step key={step.label} completed={isCompleted} active={isCurrent}>
                    <StepLabel
                      StepIconComponent={() => (
                        <Box
                          sx={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: isCompleted
                              ? 'success.main'
                              : isCurrent
                              ? 'primary.main'
                              : 'grey.300',
                            color: isCompleted || isCurrent ? 'white' : 'grey.600',
                          }}
                        >
                          {isCompleted ? (
                            <CheckCircle sx={{ fontSize: 20 }} />
                          ) : (
                            <Typography variant="caption" fontWeight="bold">
                              {index + 1}
                            </Typography>
                          )}
                        </Box>
                      )}
                    >
                      {step.label}
                    </StepLabel>
                  </Step>
                );
              })}
            </Stepper>

            {/* Next Action Alert */}
            {workflowInfo.nextAction && reconciliation.workflow_state !== 'Completed' && (
              <Alert
                severity={canAddStockTake ? 'info' : 'warning'}
                sx={{ mt: 2 }}
                action={
                  canAddStockTake ? (
                    <Button
                      color="inherit"
                      size="small"
                      onClick={() => navigate(`/inventory/multi-level-reconciliation/${id}/stock-take`)}
                      startIcon={<Inventory2 />}
                    >
                      Proceed
                    </Button>
                  ) : null
                }
              >
                <Typography variant="body2">
                  <strong>Next Step:</strong> {workflowInfo.nextAction}
                  {workflowInfo.nextRole && workflowInfo.nextRole !== userRole && (
                    <span> (Your role: {roleLabel})</span>
                  )}
                </Typography>
              </Alert>
            )}

            {reconciliation.workflow_state === 'Completed' && (
              <Alert severity="success" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Reconciliation Completed:</strong> All stock takes have been completed and the reconciliation has been submitted.
                </Typography>
              </Alert>
            )}
          </Paper>
        )}

        {/* Reconciliation View */}
        <ReconciliationView 
          reconciliation={reconciliation}
          loading={loading}
          error={error}
        />
      </Box>
    </Container>
  );
};

export default MultiLevelReconciliationDetails;

