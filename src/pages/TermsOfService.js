import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Button, useTheme, Divider } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import logoMain from '../assets/logo_main.png';

const TermsOfService = () => {
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
          Terms of Service
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Last updated: {new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}
        </Typography>
        <Divider sx={{ mb: 4 }} />

        {[
          {
            title: '1. Acceptance of Terms',
            body: 'By accessing or using Murzak POS, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the service.',
          },
          {
            title: '2. Description of Service',
            body: 'Murzak POS is a multi-tenant point-of-sale platform provided by Murzak Technologies, offering tools for sales, inventory, purchasing, and business management across retail, wholesale, service, and hospitality industries.',
          },
          {
            title: '3. Account Registration',
            body: 'You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account.',
          },
          {
            title: '4. Acceptable Use',
            body: 'You agree not to misuse the service, including attempting unauthorized access to other accounts or tenants, interfering with the platform\u2019s operation, or using the service for unlawful purposes.',
          },
          {
            title: '5. Data and Content',
            body: 'You retain ownership of the business data you enter into Murzak POS (products, sales, customers, etc.). We process this data to provide the service, as described in our Privacy Policy.',
          },
          {
            title: '6. Subscription and Billing',
            body: 'Certain features may require a paid subscription. Billing terms, pricing, and payment methods will be presented at the point of purchase and are subject to change with notice.',
          },
          {
            title: '7. Service Availability',
            body: 'We aim for high availability but do not guarantee uninterrupted access. Scheduled maintenance or unforeseen issues may cause temporary downtime.',
          },
          {
            title: '8. Limitation of Liability',
            body: 'Murzak Technologies shall not be liable for indirect, incidental, or consequential damages arising from your use of the service, to the maximum extent permitted by law.',
          },
          {
            title: '9. Changes to These Terms',
            body: 'We may update these Terms from time to time. Continued use of the service after changes take effect constitutes acceptance of the revised Terms.',
          },
          {
            title: '10. Contact',
            body: 'Questions about these Terms can be sent to murzaktechnologies@gmail.com.',
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

export default TermsOfService;

