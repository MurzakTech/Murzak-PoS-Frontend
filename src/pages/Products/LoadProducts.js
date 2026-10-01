import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { bulkUploadProducts } from '../../store/productSeedingSlice';
import IndustryProductSetup from '../IndustryProductSetup';
import { Box, CircularProgress, Alert, Typography } from '@mui/material';

/**
 * LoadProducts component - Wrapper for IndustryProductSetup that uses user's industry from profile
 * This allows users to load more products for their industry at any time
 */
const LoadProducts = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const { industries } = useAppSelector((state) => state.auth);
  const { isUploading } = useAppSelector((state) => state.productSeeding);

  // Get user's industry from profile
  const userIndustry = user?.pos_industry || null;
  const userIndustryCode = user?.pos_industry?.industry_code ||
    user?.pos_industry?.name ||
    user?.pos_industry_code ||
    user?.pos_industry_name ||
    null;

  // Find the full industry object
  const industry = industries.find(
    (ind) => 
      (userIndustryCode && (
        ind.industry_code === userIndustryCode ||
        ind.name === userIndustryCode
      )) ||
      (userIndustry && typeof userIndustry === 'object' && (
        ind.industry_code === userIndustry.industry_code ||
        ind.name === userIndustry.name ||
        ind.industry_code === userIndustry.name ||
        ind.name === userIndustry.industry_code
      ))
  ) || (userIndustry && typeof userIndustry === 'object' ? userIndustry : null);

  // Get industry code - prefer industry_code, then name
  const industryCode = industry?.industry_code || industry?.name || userIndustryCode;

  // Call bulk upload on mount (similar to Dashboard flow)
  // useEffect(() => {
  //   const uploadProducts = async () => {
  //     try {
  //       await dispatch(bulkUploadProducts()).unwrap();
  //     } catch (error) {
  //       // If bulk upload fails, still continue (products might already exist)
  //       console.warn('Bulk upload failed, continuing:', error);
  //     }
  //   };

  //   if (industryCode) {
  //     uploadProducts();
  //   }
  // }, [dispatch, industryCode]);

  // If no user, redirect to login
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // If no industry, show message
  if (!industryCode) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            No Industry Assigned
          </Typography>
          <Typography variant="body2">
            You don't have an industry assigned to your profile. Please contact your administrator to set up your industry.
          </Typography>
        </Alert>
      </Box>
    );
  }

  // Render IndustryProductSetup with the user's industry passed as prop
  return <IndustryProductSetup industryCode={industryCode} />;
};

export default LoadProducts;
