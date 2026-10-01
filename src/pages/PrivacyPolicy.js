import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Button, useTheme, Divider } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import logoMain from '../assets/logo_mark.png';

const PrivacyPolicy = () => {
  const navigate = useNavigate();
  const theme = useTheme();

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: theme.palette.background.default }}>
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
          <Box
            component="img"
            src={logoMain}
            alt="Murzak POS"
            sx={{ height: 32, cursor: 'pointer' }}
            onClick={() => navigate('/')}
          />
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/')}>
            Back to Home
          </Button>
        </Box>

        <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>
          Privacy Policy
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Last updated: {new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}
        </Typography>
        <Divider sx={{ mb: 4 }} />

        {[
          {
            title: '1. Information We Collect',
            body: 'We collect information you provide directly, such as your name, email, phone number, and business details, when you register for or use Murzak POS. We also collect operational data you enter, such as products, sales, and customer records.',
          },
          {
            title: '2. How We Use Your Information',
            body: 'We use collected information to provide and improve the service, process transactions, communicate with you about your account, and maintain the security and integrity of the platform.',
          },
          {
            title: '3. Data Storage and Security',
            body: 'Your data is stored on secured servers with access controls and encryption in transit. We take reasonable measures to protect your information from unauthorized access, alteration, or disclosure.',
          },
          {
            title: '4. Data Sharing',
            body: 'We do not sell your personal or business data. We may share data with service providers who help operate the platform (e.g., hosting providers), under confidentiality obligations, or where required by law.',
          },
          {
            title: '5. Multi-Tenant Data Isolation',
            body: 'Murzak POS is a multi-tenant platform. Each business\u2019s data is logically isolated and is not accessible to other tenants on the platform.',
          },
          {
            title: '6. Your Rights',
            body: 'You may request access to, correction of, or deletion of your personal information by contacting us. Some information may be retained as required for legal or legitimate business purposes.',
          },
          {
            title: '7. Cookies and Local Storage',
            body: 'We use browser local storage to keep you signed in and to remember preferences such as your selected theme. We do not use third-party advertising trackers.',
          },
          {
            title: '8. Changes to This Policy',
            body: 'We may update this Privacy Policy from time to time. Material changes will be communicated through the platform or by email.',
          },
          {
            title: '9. Contact',
            body: 'For privacy-related questions or requests, contact us at murzaktechnologies@gmail.com.',
          },
        ].map((section) => (
          <Box key={section.title} sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              {section.title}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
              {section.body}
            </Typography>
          </Box>
        ))}
      </Container>
    </Box>
  );
};

export default PrivacyPolicy;

