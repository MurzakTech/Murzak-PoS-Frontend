import React, { useState, useEffect } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  Close,
  Search,
  LocalHospital,
  WarningAmber,
  CheckCircle,
  Medication,
  PersonOutline,
  CalendarMonth,
} from '@mui/icons-material';
import {
  searchPatients,
  getPatientPrescriptions,
  getBatchesFEFO,
  validatePrescriptionSafety,
} from '../../../api/pharmacyHealthApi';

/**
 * Clinical Prescription Modal (Frappe Health integration)
 * Enables pharmacy POS cashiers to:
 * 1. Search clinical patients by name or phone
 * 2. View patient allergy profiles
 * 3. Load active clinical prescriptions with doctor & diagnosis
 * 4. Run clinical safety allergy validation
 * 5. Recommend FEFO (First-Expiring, First-Out) batches
 * 6. Populate the Till cart with 1 click
 */
const ClinicalPrescriptionModal = ({
  open,
  onClose,
  onLoadPrescriptionToCart,
  defaultWarehouse = '',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);
  const [prescriptions, setPrescriptions] = useState([]);
  const [selectedPrescription, setSelectedPrescription] = useState(null);

  const [safetyCheck, setSafetyCheck] = useState({ safe: true, warnings: [] });
  const [fefoBatches, setFefoBatches] = useState({}); // { [itemCode]: [batches] }
  const [loadingBatches, setLoadingBatches] = useState(false);

  useEffect(() => {
    if (!open) {
      setSearchTerm('');
      setPatients([]);
      setSelectedPatient(null);
      setPrescriptions([]);
      setSelectedPrescription(null);
      setSafetyCheck({ safe: true, warnings: [] });
      setFefoBatches({});
    }
  }, [open]);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!searchTerm.trim()) return;
    setSearching(true);
    try {
      const results = await searchPatients(searchTerm.trim());
      setPatients(results || []);
    } catch (err) {
      setPatients([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectPatient = async (patient) => {
    setSelectedPatient(patient);
    setLoadingPrescriptions(true);
    setSelectedPrescription(null);
    setSafetyCheck({ safe: true, warnings: [] });
    try {
      const rxList = await getPatientPrescriptions(patient.name);
      setPrescriptions(rxList || []);
      if (rxList && rxList.length > 0) {
        handleSelectPrescription(patient, rxList[0]);
      }
    } catch (err) {
      setPrescriptions([]);
    } finally {
      setLoadingPrescriptions(false);
    }
  };

  const handleSelectPrescription = async (patient, rx) => {
    setSelectedPrescription(rx);
    // Validate allergies
    const safety = validatePrescriptionSafety({
      patientAllergies: patient.allergies || [],
      prescriptionItems: rx.medications || [],
    });
    setSafetyCheck(safety);

    // Fetch FEFO batches for each medication
    setLoadingBatches(true);
    const batchMap = {};
    for (const med of rx.medications || []) {
      try {
        const batches = await getBatchesFEFO(med.item_code, defaultWarehouse);
        batchMap[med.item_code] = batches;
      } catch (err) {
        batchMap[med.item_code] = [];
      }
    }
    setFefoBatches(batchMap);
    setLoadingBatches(false);
  };

  const handleConfirmAddToCart = () => {
    if (!selectedPatient || !selectedPrescription) return;

    const cartItems = (selectedPrescription.medications || []).map((med) => {
      const availableBatches = fefoBatches[med.item_code] || [];
      const bestBatch = availableBatches[0]; // Earliest expiry batch

      return {
        item_code: med.item_code,
        item_name: med.drug_name || med.item_code,
        rate: Number(med.rate || 0),
        qty: Number(med.quantity || 1),
        uom: med.uom || 'Nos',
        warehouse: defaultWarehouse,
        batch_no: bestBatch?.batch_no || '',
        expiry_date: bestBatch?.expiry_date || '',
        dosage: med.dosage || '',
        period: med.period || '',
        description: med.dosage ? `${med.dosage} (${med.period || 'as prescribed'})` : '',
        prescription_only: true,
        is_service: false,
      };
    });

    onLoadPrescriptionToCart({
      patient_id: selectedPatient.name,
      patient_name: selectedPatient.patient_name,
      customer_phone: selectedPatient.mobile,
      doctor: selectedPrescription.prescriber || '',
      reference: selectedPrescription.encounter_id || selectedPrescription.id || '',
      items: cartItems,
    });

    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" aria-labelledby="clinical-rx-title">
      <DialogTitle id="clinical-rx-title" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocalHospital color="primary" />
          <Typography variant="h6">Frappe Health Clinical Prescriptions</Typography>
        </Box>
        <IconButton onClick={onClose} aria-label="Close">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 2.5 }}>
        {/* Step 1: Patient Search */}
        <Box component="form" onSubmit={handleSearch} sx={{ mb: 2, display: 'flex', gap: 1 }}>
          <TextField
            autoFocus
            fullWidth
            size="small"
            placeholder="Search patient by name, ID (e.g. PAT-001) or mobile..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <Button type="submit" variant="contained" disabled={searching || !searchTerm.trim()}>
            {searching ? <CircularProgress size={20} color="inherit" /> : 'Search'}
          </Button>
        </Box>

        {/* Patient Selection Results */}
        {patients.length > 0 && !selectedPatient && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              Select Patient:
            </Typography>
            <List dense sx={{ border: 1, borderColor: 'divider', borderRadius: 2, mt: 0.5 }}>
              {patients.map((pat) => (
                <ListItemButton key={pat.name} onClick={() => handleSelectPatient(pat)}>
                  <PersonOutline sx={{ mr: 1.5, color: 'primary.main' }} />
                  <ListItemText
                    primary={<strong>{pat.patient_name} ({pat.name})</strong>}
                    secondary={`${pat.mobile || 'No phone'} · Blood: ${pat.blood_group || 'N/A'}${pat.allergies?.length ? ` · Allergies: ${pat.allergies.join(', ')}` : ''}`}
                  />
                  {pat.allergies?.length > 0 && (
                    <Chip size="small" color="error" label={`${pat.allergies.length} Allergies`} />
                  )}
                </ListItemButton>
              ))}
            </List>
          </Box>
        )}

        {/* Selected Patient Details & Allergy Profile */}
        {selectedPatient && (
          <Box sx={{ mb: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {selectedPatient.patient_name} ({selectedPatient.name})
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Mobile: {selectedPatient.mobile || 'N/A'} · Blood Group: {selectedPatient.blood_group || 'N/A'}
                </Typography>
              </Box>
              <Button size="small" onClick={() => setSelectedPatient(null)}>
                Change Patient
              </Button>
            </Box>

            {selectedPatient.allergies?.length > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'error.main' }}>
                  Recorded Allergies:
                </Typography>
                {selectedPatient.allergies.map((allergy, i) => (
                  <Chip key={i} size="small" color="error" variant="outlined" label={allergy} />
                ))}
              </Box>
            )}
          </Box>
        )}

        {/* Safety Check Alert Banner */}
        {!safetyCheck.safe && (
          <Alert severity="error" icon={<WarningAmber fontSize="inherit" />} sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Clinical Safety Alert: Allergy Conflict Detected
            </Typography>
            {safetyCheck.warnings.map((w, idx) => (
              <Typography key={idx} variant="body2">
                • {w.message}
              </Typography>
            ))}
          </Alert>
        )}

        {/* Step 2: Prescriptions List */}
        {selectedPatient && (
          <Box>
            {loadingPrescriptions ? (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <CircularProgress size={24} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Loading patient encounter prescriptions...
                </Typography>
              </Box>
            ) : prescriptions.length === 0 ? (
              <Alert severity="info">No active prescriptions found for this patient.</Alert>
            ) : (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  Active Prescription ({selectedPrescription?.encounter_id || 'Current Encounter'})
                </Typography>

                <Box sx={{ display: 'flex', gap: 2, mb: 1.5, fontSize: '0.8125rem', color: 'text.secondary' }}>
                  <span>👨‍⚕️ Prescriber: <strong>{selectedPrescription?.prescriber || 'Attending Physician'}</strong></span>
                  <span>📅 Date: <strong>{selectedPrescription?.encounter_date || 'Today'}</strong></span>
                </Box>

                {/* Medications Table with FEFO Batch Recommendation */}
                <Table size="small" sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}>
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell><strong>Medicine</strong></TableCell>
                      <TableCell><strong>Dosage / Regimen</strong></TableCell>
                      <TableCell align="center"><strong>Qty</strong></TableCell>
                      <TableCell><strong>FEFO Batch (Earliest Expiry)</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(selectedPrescription?.medications || []).map((med, idx) => {
                      const batches = fefoBatches[med.item_code] || [];
                      const bestBatch = batches[0];
                      return (
                        <TableRow key={idx}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Medication fontSize="small" color="primary" />
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {med.drug_name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {med.item_code}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{med.dosage || 'As directed'}</Typography>
                            {med.period && <Typography variant="caption" color="text.secondary">For {med.period}</Typography>}
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {med.quantity}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {loadingBatches ? (
                              <CircularProgress size={14} />
                            ) : bestBatch ? (
                              <Box>
                                <Chip
                                  size="small"
                                  color={bestBatch.is_expiring_soon ? 'warning' : 'success'}
                                  label={`${bestBatch.batch_no} (Exp: ${bestBatch.expiry_date})`}
                                  sx={{ height: 20, fontSize: '0.6875rem' }}
                                />
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                  Stock: {bestBatch.stock_qty} available
                                </Typography>
                              </Box>
                            ) : (
                              <Typography variant="caption" color="error.main">
                                No batch available
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          disabled={!selectedPatient || !selectedPrescription || (selectedPrescription.medications || []).length === 0}
          onClick={handleConfirmAddToCart}
        >
          Load Prescribed Medicines to Till
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ClinicalPrescriptionModal;
