import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Grid,
  CircularProgress,
  Divider,
  Alert,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { Security, Info } from '@mui/icons-material';
import useSystemAPI from '../../hooks/useSystemAPI';

/**
 * PermissionAnalysis Component
 * 
 * Displays analysis of existing permissions for a doctype, including:
 * - Permission counts (how many roles have each permission)
 * - List of roles with permissions
 * - Permission recommendations based on doctype type
 * 
 * @param {Object} props
 * @param {string} props.doctype - The doctype name to analyze
 * @param {boolean} props.autoLoad - Whether to automatically load details when doctype changes (default: true)
 */
const PermissionAnalysis = ({ doctype, autoLoad = true }) => {
  const {
    doctypeDetails,
    isLoadingDetails,
    getDoctypeDetails,
  } = useSystemAPI();

  const [analysis, setAnalysis] = useState(null);

  const analyzePermissions = useCallback((details) => {
    if (!details || !details.permissions) {
      setAnalysis(null);
      return;
    }

    const { standard = [], custom = [] } = details.permissions;
    const allPermissions = [...standard, ...custom];

    // Count permissions by type
    const permissionCounts = {
      read: 0,
      write: 0,
      create: 0,
      delete: 0,
      submit: 0,
      cancel: 0,
      amend: 0,
      print: 0,
      email: 0,
      export: 0,
      import: 0,
      report: 0,
      share: 0,
      select: 0,
    };

    allPermissions.forEach((perm) => {
      Object.keys(permissionCounts).forEach((key) => {
        if (perm.permissions?.[key] === 1 || perm.permissions?.[key] === true) {
          permissionCounts[key]++;
        }
      });
    });

    // Get unique roles
    const roles = [...new Set(allPermissions.map((p) => p.role))];

    // Generate recommendations
    const recommendations = generateRecommendations(details, permissionCounts, allPermissions.length);

    setAnalysis({
      permissionCounts,
      roles,
      totalRoles: roles.length,
      totalPermissions: allPermissions.length,
      recommendations,
      isSubmittable: details.is_submittable === 1,
    });
  }, []);

  const loadDoctypeDetails = useCallback(async () => {
    if (!doctype) return;
    const result = await getDoctypeDetails(doctype);
    if (result.type?.includes('fulfilled') && result.payload) {
      analyzePermissions(result.payload);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctype]);

  useEffect(() => {
    if (doctype && autoLoad) {
      loadDoctypeDetails();
    }
  }, [doctype, autoLoad, loadDoctypeDetails]);

  const generateRecommendations = useCallback((details, counts, totalRoles) => {
    const recommendations = [];

    // Read is almost always recommended
    if (counts.read > 0) {
      recommendations.push({
        permission: 'read',
        recommended: true,
        reason: `${counts.read} of ${totalRoles} roles have read access`,
      });
    } else {
      recommendations.push({
        permission: 'read',
        recommended: true,
        reason: 'Read access is typically required',
      });
    }

    // Write recommendations
    if (counts.write > totalRoles * 0.5) {
      recommendations.push({
        permission: 'write',
        recommended: true,
        reason: `Most roles (${counts.write}/${totalRoles}) have write access`,
      });
    } else if (counts.write > 0) {
      recommendations.push({
        permission: 'write',
        recommended: false,
        reason: `Only ${counts.write} of ${totalRoles} roles have write access`,
      });
    }

    // Create recommendations
    if (counts.create > totalRoles * 0.3) {
      recommendations.push({
        permission: 'create',
        recommended: true,
        reason: `${counts.create} of ${totalRoles} roles can create`,
      });
    }

    // Submit recommendations (only for submittable doctypes)
    if (details.is_submittable === 1) {
      if (counts.submit > 0) {
        recommendations.push({
          permission: 'submit',
          recommended: true,
          reason: `${counts.submit} of ${totalRoles} roles can submit (doctype is submittable)`,
        });
      } else {
        recommendations.push({
          permission: 'submit',
          recommended: false,
          reason: 'No roles currently have submit permission (doctype is submittable)',
        });
      }
    } else {
      recommendations.push({
        permission: 'submit',
        recommended: false,
        reason: 'Doctype is not submittable',
      });
    }

    // Delete recommendations
    if (counts.delete > totalRoles * 0.3) {
      recommendations.push({
        permission: 'delete',
        recommended: true,
        reason: `${counts.delete} of ${totalRoles} roles can delete`,
      });
    } else {
      recommendations.push({
        permission: 'delete',
        recommended: false,
        reason: 'Delete permission is typically restricted',
      });
    }

    return recommendations;
  }, []);

  if (!doctype) {
    return (
      <Alert severity="info" icon={<Info />}>
        Select a doctype to view permission analysis
      </Alert>
    );
  }

  if (isLoadingDetails) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!analysis && !isLoadingDetails) {
    return (
      <Alert severity="warning">
        No permission data available for {doctype}
      </Alert>
    );
  }

  return (
    <Paper sx={{ p: 2, mt: 2, bgcolor: 'background.default' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Security fontSize="small" />
        <Typography variant="subtitle1" fontWeight="medium">
          Permission Analysis: {doctype}
        </Typography>
      </Box>

      {analysis && (
        <>
          {/* Permission Counts */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Existing Permissions
            </Typography>
            <Grid container spacing={1} sx={{ mt: 1 }}>
              {Object.entries(analysis.permissionCounts)
                .filter(([_, count]) => count > 0)
                .map(([permission, count]) => (
                  <Grid item key={permission}>
                    <Chip
                      label={`${permission}: ${count} roles`}
                      size="small"
                      color={count > analysis.totalRoles * 0.5 ? 'primary' : 'default'}
                      variant="outlined"
                    />
                  </Grid>
                ))}
            </Grid>
            {Object.values(analysis.permissionCounts).every((count) => count === 0) && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                No permissions currently configured
              </Typography>
            )}
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Roles with Permissions */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Roles with Permissions ({analysis.totalRoles})
            </Typography>
            {analysis.roles.length > 0 ? (
              <List dense sx={{ mt: 1 }}>
                {analysis.roles.map((role, index) => (
                  <ListItem key={index} sx={{ py: 0.5, px: 0 }}>
                    <ListItemText
                      primary={role}
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                No roles have permissions on this doctype
              </Typography>
            )}
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Recommendations */}
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Recommendations
            </Typography>
            <Box sx={{ mt: 1 }}>
              {analysis.recommendations.map((rec, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1,
                    mb: 1,
                    p: 1,
                    borderRadius: 1,
                    bgcolor: rec.recommended ? 'success.light' : 'warning.light',
                  }}
                >
                  <Chip
                    label={rec.permission}
                    size="small"
                    color={rec.recommended ? 'success' : 'warning'}
                    sx={{ textTransform: 'capitalize' }}
                  />
                  <Typography variant="body2" sx={{ flex: 1 }}>
                    {rec.reason}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Submittable Notice */}
          {analysis.isSubmittable && (
            <Alert severity="info" sx={{ mt: 2 }}>
              This doctype is submittable. Submit permission may be required for workflow.
            </Alert>
          )}
        </>
      )}
    </Paper>
  );
};

export default PermissionAnalysis;

