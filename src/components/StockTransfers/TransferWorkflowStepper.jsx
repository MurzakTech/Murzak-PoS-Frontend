import React from 'react';
import { Box, Stepper, Step, StepLabel, StepContent, Typography } from '@mui/material';
import {
  Create,
  CheckCircle,
  LocalShipping,
  Inventory,
  Done,
} from '@mui/icons-material';
import { getWorkflowStep } from '../../utils/stockTransferHelpers';

const steps = [
  {
    label: 'Create Request',
    icon: <Create />,
    status: 'create',
  },
  {
    label: 'Approve',
    icon: <CheckCircle />,
    status: 'approve',
  },
  {
    label: 'Dispatch',
    icon: <LocalShipping />,
    status: 'dispatch',
  },
  {
    label: 'Receive',
    icon: <Inventory />,
    status: 'receive',
  },
  {
    label: 'Complete',
    icon: <Done />,
    status: 'complete',
  },
];

/**
 * TransferWorkflowStepper Component
 * Displays the workflow progress for a stock transfer request
 * 
 * @param {Object} props - Component props
 * @param {string} props.status - Current transfer status
 * @param {string} [props.currentStep] - Explicit current step (optional)
 * @param {boolean} [props.vertical=false] - Display vertically with content
 * @returns {JSX.Element} Workflow stepper component
 * 
 * @example
 * <TransferWorkflowStepper status="In Transit" />
 * <TransferWorkflowStepper status="Approved" vertical />
 */
const TransferWorkflowStepper = ({ status, currentStep, vertical = false }) => {
  const getActiveStep = () => {
    if (currentStep) {
      const stepIndex = steps.findIndex((s) => s.status === currentStep);
      return stepIndex >= 0 ? stepIndex : 0;
    }

    if (!status) return 0;

    const workflowStep = getWorkflowStep(status);
    const stepIndex = steps.findIndex((s) => s.status === workflowStep);
    
    // Map status to step index
    if (status === 'Draft') return 0;
    if (status === 'Submitted') return 1;
    if (status === 'Approved') return 2;
    if (status === 'In Transit' || status === 'Partially In Transit') return 3;
    if (status === 'Completed') return 4;
    
    return stepIndex >= 0 ? stepIndex : 0;
  };

  const activeStep = getActiveStep();

  if (vertical) {
    return (
      <Box sx={{ width: '100%', py: 3 }}>
        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((step, index) => (
            <Step key={step.label}>
              <StepLabel
                StepIconProps={{
                  icon: step.icon,
                }}
              >
                {step.label}
              </StepLabel>
              {index === activeStep && (
                <StepContent>
                  <Typography variant="body2" color="text.secondary">
                    Current step: {step.label}
                  </Typography>
                </StepContent>
              )}
            </Step>
          ))}
        </Stepper>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', py: 3 }}>
      <Stepper activeStep={activeStep} alternativeLabel>
        {steps.map((step) => (
          <Step key={step.label}>
            <StepLabel
              StepIconProps={{
                icon: step.icon,
              }}
            >
              {step.label}
            </StepLabel>
          </Step>
        ))}
      </Stepper>
    </Box>
  );
};

export default TransferWorkflowStepper;

