
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  useTheme,
  alpha,
  IconButton,
  Dialog,
  DialogContent,
} from '@mui/material';

import {
  Store,
  Inventory,
  BusinessCenter,
  Restaurant,
  ShoppingCart,
  Cloud,
  Security,
  Analytics,
  Speed,
  Devices,
  Brightness4,
  Brightness7,
  ArrowForward,
  PlayCircle,
  Close as CloseIcon,
} from '@mui/icons-material';

import { m, LazyMotion, AnimatePresence } from 'framer-motion';
import { useThemeMode } from '../theme/ThemeProvider';
import logoMain from '../assets/logo_main.png';
import heroSlide1 from '../assets/hero-slide-1.png';
import heroSlide2 from '../assets/hero-slide-2.png';
import heroSlide3 from '../assets/hero-slide-3.png';

const HERO_SLIDES = [heroSlide1, heroSlide2, heroSlide3];

const loadFeatures = () => import('framer-motion').then((res) => res.domAnimation);

const MotionBox = m(Box);
const MotionCard = m(Card);
const MotionButton = m(Button);

// Enhanced FeatureCard with better styling
const FeatureCard = ({ icon, title, description, color, hoverEffect = { y: -8, scale: 1.02 }, variants, sx }) => {
  const theme = useTheme();
  return (
    <MotionCard
      variants={variants}
      whileHover={hoverEffect}
      tabIndex={0}
      role="article"
      sx={{
        height: '100%',
        background: `linear-gradient(135deg, ${alpha(color || theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.background.paper, 0.8)} 100%)`,
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        borderRadius: 2,
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
        '&:hover': {
          boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.12)}`,
          borderColor: alpha(theme.palette.primary.main, 0.3),
          transform: 'translateY(-4px)',
        },
        '&:focus': {
          outline: `2px solid ${theme.palette.primary.main}`,
          boxShadow: `0 0 0 4px ${alpha(theme.palette.primary.main, 0.1)}`,
        },
        ...sx,
      }}
    >
      <CardContent sx={{ p: 3, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box
          sx={{
            color: color || theme.palette.primary.main,
            mb: 2,
            display: 'flex',
            justifyContent: 'center',
            '& .MuiSvgIcon-root': {
              fontSize: 36,
            },
          }}
        >
          {icon}
        </Box>
        <Typography 
          variant="h6" 
          component="h3" 
          gutterBottom 
          sx={{ 
            fontWeight: 600, 
            fontSize: '1.1rem',
            color: theme.palette.text.primary,
          }}
        >
          {title}
        </Typography>
        <Typography 
          variant="body2" 
          color="text.secondary" 
          sx={{ 
            fontSize: '0.9rem', 
            lineHeight: 1.6,
            flexGrow: 1,
          }}
        >
          {description}
        </Typography>
      </CardContent>
    </MotionCard>
  );
};

const HeroSlideshow = () => {
  const theme = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [isPaused]);

  return (
    <Box
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      sx={{
        position: 'relative',
        width: '100%',
        maxWidth: 520,
        aspectRatio: '4 / 3',
        borderRadius: 3,
        overflow: 'hidden',
        boxShadow: `0 16px 48px ${alpha(theme.palette.primary.main, 0.2)}`,
      }}
    >
      <AnimatePresence mode="wait">
        <m.img
          key={activeIndex}
          src={HERO_SLIDES[activeIndex]}
          alt={`Murzak POS screenshot ${activeIndex + 1}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      </AnimatePresence>

      <Box
        sx={{
          position: 'absolute',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 1,
          zIndex: 1,
        }}
      >
        {HERO_SLIDES.map((_, index) => (
          <Box
            key={index}
            onClick={() => setActiveIndex(index)}
            sx={{
              width: index === activeIndex ? 20 : 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: index === activeIndex ? 'common.white' : alpha('#ffffff', 0.5),
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
          />
        ))}
      </Box>
    </Box>
  );
};

const Landing = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { mode, toggleColorMode } = useThemeMode();
  const [demoDialogOpen, setDemoDialogOpen] = useState(false);

  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] },
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const posModes = [
    {
      icon: <Store />,
      title: 'Retail',
      description: 'Complete retail POS solution with inventory management.',
      color: theme.palette.primary.main,
    },
    {
      icon: <Inventory />,
      title: 'Wholesale',
      description: 'B2B focused POS with bulk ordering, wholesale pricing tiers, etc.',
      color: theme.palette.success.main,
    },
    {
      icon: <BusinessCenter />,
      title: 'Service',
      description: 'Service-based POS with appointment scheduling, service mgmt.',
      color: theme.palette.info.main,
    },
    {
      icon: <Restaurant />,
      title: 'Hospitality',
      description: 'Restaurant/hospitality POS with table mgmt, kitchen display.',
      color: theme.palette.warning.main,
    },
  ];

  const features = [
    {
      icon: <Cloud />,
      title: 'Multi-Tenant Cloud',
      description: 'Scalable cloud infrastructure supporting multiple businesses on one platform.',
    },
    {
      icon: <Security />,
      title: 'Enterprise Security',
      description: 'Bank-level encryption and security protocols to protect your business data.',
    },
    {
      icon: <Analytics />,
      title: 'Real-Time Analytics',
      description: 'Get instant insights with comprehensive reporting and analytics dashboard.',
    },
    {
      icon: <Speed />,
      title: 'Lightning Fast',
      description: 'Optimized performance ensuring smooth operations even during peak hours.',
    },
    {
      icon: <Devices />,
      title: 'Multi-Device',
      description: 'Access your POS from desktop, tablet, or mobile - anytime, anywhere.',
    },
    {
      icon: <ShoppingCart />,
      title: 'E-Commerce Ready',
      description: 'Seamless integration with online stores - coming soon to expand your reach.',
    },
  ];

  return (
    <LazyMotion features={loadFeatures} strict>
      <Box sx={{ minHeight: '100vh', overflow: 'hidden' }}>
        {/* Enhanced Hero Section */}
        <Box
          sx={{
            minHeight: '100vh',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            background: `linear-gradient(135deg, ${alpha(theme.palette.background.default, 0.97)} 0%, ${alpha(theme.palette.background.paper, 0.97)} 100%)`,
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '60%',
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.03)} 0%, transparent 50%)`,
              zIndex: 0,
            },
          }}
        >
          <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1, py: 8 }}>
            <MotionBox
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 8,
              }}
            >
              <Box
                component="img"
                src={logoMain}
                alt="Murzak POS"
                sx={{ 
                  height: 40,
                  filter: mode === 'dark' ? 'brightness(0) invert(1)' : 'none',
                }}
              />
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                <IconButton
                  onClick={toggleColorMode}
                  aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                  sx={{
                    color: theme.palette.text.secondary,
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.08),
                      color: theme.palette.primary.main,
                    },
                  }}
                >
                  {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
                </IconButton>
                <MotionButton
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  variant="text"
                  onClick={() => navigate('/login')}
                  sx={{
                    color: theme.palette.text.primary,
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.08),
                    },
                  }}
                >
                  Login
                </MotionButton>
                <MotionButton
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  variant="contained"
                  onClick={() => navigate('/register')}
                  sx={{
                    fontSize: '0.9rem',
                    px: 3,
                    py: 1,
                    borderRadius: 2,
                    boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.3)}`,
                  }}
                >
                  Get Started
                </MotionButton>
              </Box>
            </MotionBox>

            <Grid container spacing={6} alignItems="center">
              <Grid item xs={12} md={6}>
                <MotionBox {...fadeInUp}>
                  <Typography
                    variant="h1"
                    component="h1"
                    sx={{
                      fontSize: { xs: '2.5rem', sm: '3rem', md: '3.5rem', lg: '4rem' },
                      fontWeight: 800,
                      mb: 3,
                      background: `linear-gradient(135deg, ${theme.palette.text.primary} 0%, ${alpha(theme.palette.text.primary, 0.8)} 100%)`,
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      lineHeight: 1.1,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    The Complete Multi-Tenant POS Solution
                  </Typography>
                  <Typography
                    variant="h6"
                    color="text.secondary"
                    sx={{ 
                      mb: 4, 
                      lineHeight: 1.7, 
                      maxWidth: '90%', 
                      fontSize: { xs: '1rem', sm: '1.1rem' },
                      fontWeight: 400,
                    }}
                  >
                    Power your business across retail, wholesale, service, and hospitality
                    industries with our all-in-one platform. Scalable, secure, and designed for growth.
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                    <MotionButton
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      variant="contained"
                      size="large"
                      endIcon={<ArrowForward />}
                      sx={{
                        px: 4,
                        py: 1.5,
                        fontSize: '1rem',
                        borderRadius: 2,
                        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                        boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                        '&:hover': {
                          boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
                        },
                      }}
                    >
                      Start Free Trial
                    </MotionButton>
                    <MotionButton
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      variant="outlined"
                      size="large"
                      startIcon={<PlayCircle />}
                      onClick={() => setDemoDialogOpen(true)}
                      sx={{
                        px: 4,
                        py: 1.5,
                        fontSize: '1rem',
                        borderRadius: 2,
                        borderWidth: 2,
                        '&:hover': {
                          borderWidth: 2,
                        },
                      }}
                    >
                      Watch Demo
                    </MotionButton>
                  </Box>
                </MotionBox>
              </Grid>
              <Grid item xs={12} md={6}>
                <MotionBox
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.7, delay: 0.2 }}
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <HeroSlideshow />
                </MotionBox>
              </Grid>
            </Grid>
          </Container>
        </Box>

        {/* Enhanced POS Modes Section */}
        <Box
          sx={{
            py: 12,
            background: theme.palette.background.default,
            position: 'relative',
          }}
        >
          <Container maxWidth="lg">
            <MotionBox
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.6 }}
              sx={{ textAlign: 'center', mb: 8 }}
            >
              <Typography 
                variant="h2" 
                component="h2" 
                gutterBottom 
                sx={{ 
                  fontWeight: 700, 
                  fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                  mb: 2,
                }}
              >
                Built for Every Industry
              </Typography>
              <Typography
                variant="h6"
                color="text.secondary"
                sx={{ 
                  maxWidth: 600, 
                  mx: 'auto', 
                  fontSize: '1.1rem',
                  fontWeight: 400,
                  lineHeight: 1.6,
                }}
              >
                Choose the POS mode that perfectly fits your business model and industry requirements
              </Typography>
            </MotionBox>

            <MotionBox
              variants={staggerContainer}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true, margin: '-50px' }}
            >
              <Grid container spacing={4}>
                {posModes.map((mode, index) => (
                  <Grid item xs={10} sm={4} md={3} key={index}>
                    <FeatureCard
                      icon={mode.icon}
                      title={mode.title}
                      description={mode.description}
                      color={mode.color}
                      variants={fadeInUp}
                    />
                  </Grid>
                ))}
              </Grid>
            </MotionBox>
          </Container>
        </Box>

        {/* Enhanced Features Section */}
        <Box
          sx={{
            py: 12,
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.02)} 0%, ${alpha(theme.palette.background.paper, 0.8)} 100%)`,
            position: 'relative',
          }}
        >
          <Container maxWidth="lg">
            <MotionBox
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.6 }}
              sx={{ textAlign: 'center', mb: 8 }}
            >
              <Typography 
                variant="h2" 
                component="h2" 
                gutterBottom 
                sx={{ 
                  fontWeight: 700, 
                  fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                  mb: 2,
                }}
              >
                Enterprise-Grade Features
              </Typography>
              <Typography 
                variant="h6" 
                color="text.secondary" 
                sx={{ 
                  maxWidth: 600, 
                  mx: 'auto', 
                  fontSize: '1.1rem',
                  fontWeight: 400,
                }}
              >
                Everything you need to run your business efficiently and scale with confidence
              </Typography>
            </MotionBox>

            <MotionBox
              variants={staggerContainer}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true, margin: '-50px' }}
            >
              <Grid container spacing={4}>
                {features.map((feature, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <FeatureCard
                      icon={feature.icon}
                      title={feature.title}
                      description={feature.description}
                      variants={fadeInUp}
                    />
                  </Grid>
                ))}
              </Grid>
            </MotionBox>
          </Container>
        </Box>

        {/* Enhanced CTA Section */}
        <Box
          sx={{
            py: 12,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Container maxWidth="md">
            <MotionBox
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              sx={{ textAlign: 'center', color: 'white', position: 'relative', zIndex: 1 }}
            >
              <Typography 
                variant="h2" 
                component="h2" 
                gutterBottom 
                sx={{ 
                  fontWeight: 700, 
                  mb: 3, 
                  fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                  color: 'common.white',
                }}
              >
                Ready to Transform Your Business?
              </Typography>
              <Typography 
                variant="h6" 
                sx={{ 
                  mb: 5, 
                  color: 'common.white',
                  opacity: 0.95, 
                  maxWidth: 700, 
                  mx: 'auto', 
                  fontSize: '1.1rem', 
                  lineHeight: 1.7,
                  fontWeight: 400,
                }}
              >
                Join thousands of businesses using Murzak POS to streamline operations
                and boost revenue. Start your free trial today - no credit card required.
              </Typography>
              <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap' }}>
                <MotionButton
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForward />}
                  onClick={() => navigate('/register')}
                  sx={{
                    px: 5,
                    py: 1.5,
                    fontSize: '1rem',
                    borderRadius: 2,
                    backgroundColor: 'white',
                    color: theme.palette.primary.main,
                    fontWeight: 600,
                    boxShadow: `0 4px 12px ${alpha('#000000', 0.2)}`,
                    '&:hover': {
                      backgroundColor: alpha('#ffffff', 0.95),
                      boxShadow: `0 6px 20px ${alpha('#000000', 0.3)}`,
                    },
                  }}
                >
                  Start Free Trial
                </MotionButton>
                <MotionButton
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  variant="outlined"
                  size="large"
                  onClick={() => navigate('/login')}
                  sx={{
                    px: 5,
                    py: 1.5,
                    fontSize: '1rem',
                    borderRadius: 2,
                    borderColor: 'white',
                    color: 'white',
                    borderWidth: 2,
                    fontWeight: 600,
                    '&:hover': {
                      backgroundColor: alpha('#ffffff', 0.15),
                      borderWidth: 2,
                    },
                  }}
                >
                  Schedule Demo
                </MotionButton>
              </Box>
            </MotionBox>
          </Container>
        </Box>

        {/* Enhanced Footer */}
        <Box
          sx={{
            py: 4,
            backgroundColor: theme.palette.background.paper,
            borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          }}
        >
          <Container maxWidth="lg">
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              flexWrap: 'wrap', 
              gap: 3,
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  component="img"
                  src={logoMain}
                  alt="Murzak POS"
                  sx={{ 
                    height: 24,
                    filter: mode === 'dark' ? 'brightness(0) invert(1)' : 'none',
                  }}
                />
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  sx={{ fontSize: '0.9rem' }}
                >
                  © {new Date().getFullYear()} Murzak POS. All rights reserved.
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 4 }}>
                {[
                  { label: 'Privacy Policy', path: '/privacy-policy' },
                  { label: 'Terms of Service', path: '/terms-of-service' },
                  { label: 'Contact Us', path: '/contact-us' },
                ].map((item) => (
                  <Typography
                    key={item.label}
                    variant="body2"
                    color="text.secondary"
                    sx={{ 
                      cursor: 'pointer', 
                      fontSize: '0.9rem', 
                      fontWeight: 500,
                      transition: 'color 0.2s ease',
                      '&:hover': { 
                        color: theme.palette.primary.main 
                      },
                    }}
                    onClick={() => navigate(item.path)}
                    role="link"
                    tabIndex={0}
                  >
                    {item.label}
                  </Typography>
                ))}
              </Box>
            </Box>
          </Container>
        </Box>
      </Box>

      <Dialog
        open={demoDialogOpen}
        onClose={() => setDemoDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogContent sx={{ p: 0, position: 'relative', backgroundColor: '#000' }}>
          <IconButton
            onClick={() => setDemoDialogOpen(false)}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 1,
              color: 'common.white',
              backgroundColor: alpha('#000000', 0.4),
              '&:hover': { backgroundColor: alpha('#000000', 0.6) },
            }}
          >
            <CloseIcon />
          </IconButton>
          <video
            src="/videos/demo.mp4"
            controls
            autoPlay
            style={{ width: '100%', display: 'block' }}
          >
            Your browser does not support the video tag.
          </video>
        </DialogContent>
      </Dialog>
    </LazyMotion>
  );
};

export default Landing;
