import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import IndustryProductSetup from '../IndustryProductSetup';
import { Icon } from '../../newlook/components';

/**
 * LoadProducts component - Wrapper for IndustryProductSetup that uses user's industry from profile.
 * Migrated to NewLook design tokens without MUI.
 */
const LoadProducts = () => {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const { industries } = useAppSelector((state) => state.auth);

  // Get user's industry from profile
  const userIndustry = user?.pos_industry || null;
  const userIndustryCode = user?.pos_industry?.industry_code ||
    user?.pos_industry?.name ||
    user?.pos_industry_code ||
    user?.pos_industry_name ||
    null;

  // Find the full industry object
  const industry = (industries || []).find(
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

  // If no user, redirect to login
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // If no industry, show message
  if (!industryCode) {
    return (
      <div style={{ padding: 'var(--space-6)', maxWidth: 720 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 'var(--space-3)',
            padding: 'var(--space-4)',
            borderRadius: 'var(--radius-input)',
            backgroundColor: 'var(--soft)',
            border: '1px solid var(--line)',
            color: 'var(--warn)',
          }}
        >
          <Icon name="alert" />
          <div>
            <h2 style={{ fontSize: 'var(--card-title-size)', fontWeight: 700, margin: '0 0 var(--space-1) 0', color: 'var(--ink)' }}>
              No Industry Assigned
            </h2>
            <p style={{ fontSize: 'var(--body-size)', color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
              You don't have an industry assigned to your profile. Please contact your administrator to set up your industry.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Render IndustryProductSetup with the user's industry passed as prop
  return <IndustryProductSetup industryCode={industryCode} />;
};

export default LoadProducts;
