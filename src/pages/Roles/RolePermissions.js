import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Checkbox,
  TextField,
  Grid,
  FormControlLabel,
  Chip,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Container,
} from '@mui/material';
import { ArrowBack, Security, Add, ContentCopy } from '@mui/icons-material';
import useRoleManagement from '../../hooks/useRoleManagement';
import DoctypeSelector from '../../components/Roles/DoctypeSelector';
import PermissionAnalysis from '../../components/Roles/PermissionAnalysis';

const PERMISSION_FLAGS = [
  { key: 'read', label: 'Read' },
  { key: 'write', label: 'Write' },
  { key: 'create', label: 'Create' },
  { key: 'delete', label: 'Delete' },
  { key: 'submit', label: 'Submit' },
  { key: 'cancel', label: 'Cancel' },
  { key: 'amend', label: 'Amend' },
  { key: 'print', label: 'Print' },
  { key: 'email', label: 'Email' },
  { key: 'export', label: 'Export' },
  { key: 'import', label: 'Import' },
  { key: 'report', label: 'Report' },
  { key: 'share', label: 'Share' },
  { key: 'select', label: 'Select' },
];

const RolePermissions = () => {
  const navigate = useNavigate();
  const { roleName } = useParams();
  const {
    rolePermissions,
    isLoadingPermissions,
    getRolePermissions,
    assignPermissions,
    removePermissions,
    roles,
    listRoles,
  } = useRoleManagement();

  const [permissions, setPermissions] = useState([]);
  const [newDoctype, setNewDoctype] = useState('');
  const [newPermissions, setNewPermissions] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [templateRole, setTemplateRole] = useState('');
  const [templatePermissions, setTemplatePermissions] = useState(null);

  useEffect(() => {
    if (roleName) {
      const decodedRoleName = decodeURIComponent(roleName);
      loadPermissions(decodedRoleName);
      // Load roles list only once when component mounts or roleName changes
      listRoles({}, { page: 1, pageSize: 200 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleName]);

  const loadPermissions = async (roleName) => {
    const result = await getRolePermissions(roleName);
    if (result.type?.includes('fulfilled') && result.payload?.permissions) {
      setPermissions(result.payload.permissions || []);
    }
  };

  const handlePermissionChange = (doctype, permissionKey, value) => {
    setNewPermissions((prev) => ({
      ...prev,
      [permissionKey]: value,
    }));
  };

  const handleAddPermission = async () => {
    if (!newDoctype.trim()) return;

    const decodedRoleName = decodeURIComponent(roleName);
    const perms = {};
    PERMISSION_FLAGS.forEach((flag) => {
      perms[flag.key] = newPermissions[flag.key] || false;
    });

    const result = await assignPermissions(decodedRoleName, newDoctype.trim(), perms);
    if (result.type?.includes('fulfilled')) {
      setNewDoctype('');
      setNewPermissions({});
      setTemplateRole('');
      setTemplatePermissions(null);
      setShowAddForm(false);
      loadPermissions(decodedRoleName);
    }
  };

  const handleRemovePermission = async (doctype) => {
    const decodedRoleName = decodeURIComponent(roleName);
    const result = await removePermissions(decodedRoleName, doctype);
    if (result.type?.includes('fulfilled')) {
      loadPermissions(decodedRoleName);
    }
  };

  const handleLoadTemplate = async () => {
    if (!templateRole || !newDoctype) return;

    const result = await getRolePermissions(templateRole);
    if (result.type?.includes('fulfilled') && result.payload?.permissions) {
      const templatePerm = result.payload.permissions.find(
        (p) => p.doctype === newDoctype
      );
      if (templatePerm && templatePerm.permissions) {
        const perms = {};
        PERMISSION_FLAGS.forEach((flag) => {
          perms[flag.key] =
            templatePerm.permissions[flag.key] === 1 ||
            templatePerm.permissions[flag.key] === true;
        });
        setNewPermissions(perms);
        setTemplatePermissions(templatePerm);
      } else {
        setTemplatePermissions(null);
      }
    }
  };

  if (!roleName) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Typography variant="h6" color="error">
            Role name is required
          </Typography>
          <Button onClick={() => navigate('/roles')} sx={{ mt: 2 }}>
            Back to Roles
          </Button>
        </Box>
      </Container>
    );
  }

  const decodedRoleName = decodeURIComponent(roleName);

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={() => navigate('/roles')} sx={{ mr: 2 }}>
            <ArrowBack />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Security />
            <Typography variant="h4" component="h1">
              Permissions: {decodedRoleName}
            </Typography>
          </Box>
        </Box>

        {isLoadingPermissions ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle1">DocType Permissions</Typography>
              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={() => setShowAddForm(!showAddForm)}
              >
                Add Permissions
              </Button>
            </Box>

            {showAddForm && (
              <Paper sx={{ p: 2, mb: 2, bgcolor: 'background.default' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Add New DocType Permissions
                </Typography>
                
                {/* Doctype Selector */}
                <Box sx={{ mb: 2 }}>
                  <DoctypeSelector
                    selectedDoctype={newDoctype}
                    onSelect={(doctype) => setNewDoctype(doctype)}
                    showMetadata={true}
                  />
                </Box>

                {/* Permission Analysis */}
                {newDoctype && (
                  <PermissionAnalysis doctype={newDoctype} />
                )}

                {/* Permission Template */}
                {newDoctype && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Copy Permissions from Existing Role (Optional)
                    </Typography>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid item xs={12} md={8}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Select Role to Copy From</InputLabel>
                          <Select
                            value={templateRole}
                            label="Select Role to Copy From"
                            onChange={(e) => setTemplateRole(e.target.value)}
                          >
                            <MenuItem value="">
                              <em>None - Set manually</em>
                            </MenuItem>
                            {roles
                              .filter((r) => {
                                const rName = r.name || r.role_name;
                                return rName !== decodedRoleName;
                              })
                              .map((r) => {
                                const rName = r.name || r.role_name;
                                return (
                                  <MenuItem key={rName} value={rName}>
                                    {rName}
                                  </MenuItem>
                                );
                              })}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Button
                          variant="outlined"
                          startIcon={<ContentCopy />}
                          onClick={handleLoadTemplate}
                          disabled={!templateRole || !newDoctype}
                          fullWidth
                        >
                          Load Template
                        </Button>
                      </Grid>
                    </Grid>
                    {templatePermissions && (
                      <Alert severity="success" sx={{ mt: 1 }}>
                        Permissions loaded from {templateRole} for {newDoctype}
                      </Alert>
                    )}
                  </Box>
                )}

                {/* Permission Flags */}
                {newDoctype && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Select Permissions
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                      {PERMISSION_FLAGS.map((flag) => (
                        <FormControlLabel
                          key={flag.key}
                          control={
                            <Checkbox
                              checked={newPermissions[flag.key] || false}
                              onChange={(e) =>
                                handlePermissionChange(null, flag.key, e.target.checked)
                              }
                              size="small"
                            />
                          }
                          label={flag.label}
                        />
                      ))}
                    </Box>
                  </Box>
                )}

                {/* Add Button */}
                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    onClick={handleAddPermission}
                    disabled={!newDoctype.trim()}
                  >
                    Add Permissions
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setShowAddForm(false);
                      setNewDoctype('');
                      setNewPermissions({});
                      setTemplateRole('');
                      setTemplatePermissions(null);
                    }}
                  >
                    Cancel
                  </Button>
                </Box>
              </Paper>
            )}

            {permissions.length === 0 ? (
              <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                No permissions configured for this role
              </Typography>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>DocType</TableCell>
                      <TableCell align="center">Permission Level</TableCell>
                      <TableCell align="center">If Owner</TableCell>
                      <TableCell>Permissions</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {permissions.map((perm, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {perm.doctype}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">{perm.permlevel || 0}</TableCell>
                        <TableCell align="center">
                          {perm.if_owner ? (
                            <Chip label="Yes" size="small" color="primary" />
                          ) : (
                            <Chip label="No" size="small" variant="outlined" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {PERMISSION_FLAGS.map((flag) => {
                              const hasPermission =
                                perm.permissions?.[flag.key] === 1 ||
                                perm.permissions?.[flag.key] === true;
                              return (
                                <Tooltip key={flag.key} title={flag.label}>
                                  <Chip
                                    label={flag.label}
                                    size="small"
                                    color={hasPermission ? 'success' : 'default'}
                                    variant={hasPermission ? 'filled' : 'outlined'}
                                  />
                                </Tooltip>
                              );
                            })}
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            color="error"
                            onClick={() => handleRemovePermission(perm.doctype)}
                          >
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default RolePermissions;

