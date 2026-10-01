import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Button, useTheme, GridLegacy as Grid, Paper, alpha } from '@mui/material';
import { ArrowBack as ArrowBackIcon, Email as EmailIcon, LocationOn as LocationIcon } from '@mui/icons-material';
import logoMain from '../assets/logo_mark.png';

const ContactUs = () => {
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
          Contact Us
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 5, maxWidth: 560 }}>
          Have a question about Murzak POS, need support, or want to talk about your business needs?
          Reach out and our team will get back to you.
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
                backgroundColor: alpha(theme.palette.primary.main, 0.04),
                height: '100%',
              }}
            >
              <EmailIcon sx={{ color: theme.palette.primary.main, fontSize: 32, mb: 1.5 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                Email
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                For support, sales, or general enquiries.
              </Typography>
              <Button
                href="mailto:murzaktechnologies@gmail.com"
                variant="text"
                sx={{ p: 0, fontWeight: 600 }}
              >
                murzaktechnologies@gmail.com
              </Button>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
                backgroundColor: alpha(theme.palette.primary.main, 0.04),
                height: '100%',
              }}
            >
              <LocationIcon sx={{ color: theme.palette.primary.main, fontSize: 32, mb: 1.5 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                Based in Nairobi
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Serving businesses across Kenya with managed hosting, business systems, and custom software.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default ContactUs;

