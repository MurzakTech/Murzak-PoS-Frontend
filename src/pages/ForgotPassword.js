import React, { useState } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Box,
  Typography,
  Button,
  TextField,
  Link,
  Alert,
  CircularProgress,
  Stack,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ArrowBack as ArrowBackIcon,
  MarkEmailReadOutlined as MailIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import BrandLogo from '../components/Common/BrandLogo';
import PasswordChecklist from '../components/Auth/PasswordChecklist';
import { validatePassword } from '../utils/passwordRules';
import { classifyLoginId, LOGIN_ID_ERROR } from '../utils/phone';
import { requestPasswordReset, resetPasswordWithCode } from '../api/passwordResetApi';
import { friendlyErrorMessage, errorSeverity } from '../utils/friendlyError';

/**
 * Forgot password, in three steps on one page:
 * 1. Type the email or phone number on the account; a 6-digit code is emailed.
 * 2. Type the code and a new password.
 * 3. Done: back to sign in.
 */
const ForgotPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState('request'); // request | reset | done
  const [identifier, setIdentifier] = useState(location.state?.loginId || '');
  const [notice, setNotice] = useState(null); // { severity, text, requirements? }
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const requestForm = useForm({ defaultValues: { loginId: identifier } });
  const resetForm = useForm({ defaultValues: { code: '', password: '' } });

  // Refusals (wrong code, weak password) are amber; no connection or a crash is red
  const showError = (err) =>
    setNotice({
      severity: errorSeverity(err),
      text: friendlyErrorMessage(err),
      requirements: err?.response?.data?.message?.requirements || null,
    });

  const sendCode = async ({ loginId }) => {
    setBusy(true);
    setNotice(null);
    try {
      const id = classifyLoginId(loginId);
      const value = id.value || loginId.trim();
      const res = await requestPasswordReset(value);
      setIdentifier(value);
      setStep('reset');
      setNotice({ severity: 'info', text: res.message || 'If that matches an account, we have emailed a 6-digit code.' });
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async ({ code, password }) => {
    setBusy(true);
    setNotice(null);
    try {
      await resetPasswordWithCode({ identifier, code, newPassword: password });
      setStep('done');
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const res = await requestPasswordReset(identifier);
      setNotice({
        severity: 'info',
        text: res.retry_after
          ? `A code was sent less than a minute ago. Wait ${res.retry_after} seconds before asking for another.`
          : res.message || 'A new code is on its way.',
      });
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  };

  const password = resetForm.watch('password');

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default', px: { xs: 2, sm: 6 }, py: { xs: 3, md: 4 } }}>
      <RouterLink to="/" aria-label="Murzak POS home" style={{ textDecoration: 'none', alignSelf: 'flex-start' }}>
        <BrandLogo size={34} />
      </RouterLink>

      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
        <Box sx={{ width: '100%', maxWidth: 420 }}>
          {step !== 'done' && (
            <>
              <Typography variant="h2" sx={{ mb: 0.75 }}>
                {step === 'request' ? 'Reset your password' : 'Enter your code'}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                {step === 'request'
                  ? 'Type the email address or phone number on your account. We will email you a 6-digit code.'
                  : <>We sent the code to the email address on the account for <strong>{identifier}</strong>.</>}
              </Typography>
            </>
          )}

          {notice && (
            <Alert severity={notice.severity} sx={{ mb: 2.5 }} onClose={() => setNotice(null)} role={notice.severity === 'info' ? 'status' : 'alert'}>
              {notice.text}
              {notice.requirements?.length > 0 && <Box sx={{ mt: 0.5 }}>Your password still needs: {notice.requirements.join('; ')}.</Box>}
            </Alert>
          )}

          {step === 'request' && (
            <Box component="form" onSubmit={requestForm.handleSubmit(sendCode)} noValidate>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="Email or phone number"
                  autoComplete="username"
                  autoFocus
                  inputProps={{ autoCapitalize: 'none', autoCorrect: 'off', spellCheck: false }}
                  {...requestForm.register('loginId', {
                    required: 'Enter your email address or phone number',
                    validate: (v) => classifyLoginId(v).type !== null || LOGIN_ID_ERROR,
                  })}
                  error={!!requestForm.formState.errors.loginId}
                  helperText={requestForm.formState.errors.loginId?.message || ' '}
                />
                <Button type="submit" variant="contained" size="large" fullWidth disabled={busy} startIcon={!busy && <MailIcon />}>
                  {busy ? <CircularProgress size={22} color="inherit" /> : 'Email me a code'}
                </Button>
              </Stack>
            </Box>
          )}

          {step === 'reset' && (
            <Box component="form" onSubmit={resetForm.handleSubmit(resetPassword)} noValidate>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="6-digit code"
                  autoComplete="one-time-code"
                  autoFocus
                  inputProps={{ inputMode: 'numeric', maxLength: 9, style: { letterSpacing: 6, fontSize: 20 } }}
                  {...resetForm.register('code', {
                    required: 'Enter the code from the email',
                    validate: (v) => v.replace(/\D/g, '').length === 6 || 'The code has 6 digits',
                  })}
                  error={!!resetForm.formState.errors.code}
                  helperText={resetForm.formState.errors.code?.message || ' '}
                />
                <Box>
                  <TextField
                    fullWidth
                    label="New password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    {...resetForm.register('password', { required: 'Choose a new password', validate: validatePassword })}
                    error={!!resetForm.formState.errors.password}
                    helperText={resetForm.formState.errors.password?.message}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowPassword((s) => !s)} edge="end" size="small" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                            {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  <PasswordChecklist password={password || ''} />
                </Box>
                <Button type="submit" variant="contained" size="large" fullWidth disabled={busy}>
                  {busy ? <CircularProgress size={22} color="inherit" /> : 'Set new password'}
                </Button>
                <Stack direction="row" justifyContent="space-between">
                  <Link component="button" type="button" variant="body2" onClick={() => { setStep('request'); setNotice(null); }}>
                    Use a different email
                  </Link>
                  <Link component="button" type="button" variant="body2" onClick={resend} disabled={busy}>
                    Send a new code
                  </Link>
                </Stack>
              </Stack>
            </Box>
          )}

          {step === 'done' && (
            <Box sx={{ textAlign: 'center' }}>
              <CheckCircleIcon sx={{ fontSize: 56, color: 'success.main', mb: 1 }} />
              <Typography variant="h3" sx={{ mb: 1 }}>
                Password changed
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                You can now sign in with your new password. For your safety, any other devices that were signed in have been signed out.
              </Typography>
              <Button variant="contained" size="large" fullWidth onClick={() => navigate('/login', { replace: true })}>
                Go to sign in
              </Button>
            </Box>
          )}

          {step !== 'done' && (
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Link component={RouterLink} to="/login" underline="hover" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontWeight: 600 }}>
                <ArrowBackIcon fontSize="small" /> Back to sign in
              </Link>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default ForgotPassword;
