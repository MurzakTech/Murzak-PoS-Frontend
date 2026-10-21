import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button, Card, Field, Icon } from '../newlook/components';
import { useThemeMode } from '../theme/ThemeProvider';
import Backdrop from '../newlook/brand/Backdrop';
import logoMark from '../assets/logo_mark.png';
import PasswordChecklist from '../components/Auth/PasswordChecklist';
import { validatePassword } from '../utils/passwordRules';
import { classifyLoginId, LOGIN_ID_ERROR } from '../utils/phone';
import { requestPasswordReset, resetPasswordWithCode } from '../api/passwordResetApi';
import { friendlyErrorMessage, errorSeverity } from '../utils/friendlyError';
import '../newlook/auth/auth.css';

/**
 * Forgot password in NewLook design:
 * 1. Type the email or phone number on the account; a 6-digit code is emailed.
 * 2. Type the code and a new password.
 * 3. Done: back to sign in.
 */
const ForgotPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, toggleColorMode } = useThemeMode();

  const [step, setStep] = useState('request'); // request | reset | done
  const [identifier, setIdentifier] = useState(location.state?.loginId || '');
  const [loginId, setLoginId] = useState(location.state?.loginId || '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState(null); // { severity, text, requirements? }
  const [busy, setBusy] = useState(false);
  const [problems, setProblems] = useState({});

  const showError = (err) =>
    setNotice({
      severity: errorSeverity(err),
      text: friendlyErrorMessage(err),
      requirements: err?.response?.data?.message?.requirements || null,
    });

  const sendCode = async (e) => {
    e.preventDefault();
    if (busy) return;

    const trimmed = loginId.trim();
    if (!trimmed) {
      setProblems({ loginId: 'Enter your email address or phone number' });
      return;
    }
    const id = classifyLoginId(trimmed);
    if (id.type === null) {
      setProblems({ loginId: LOGIN_ID_ERROR });
      return;
    }

    setBusy(true);
    setNotice(null);
    setProblems({});
    try {
      const value = id.value || trimmed;
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

  const resetPassword = async (e) => {
    e.preventDefault();
    if (busy) return;

    const found = {};
    const cleanCode = code.replace(/\D/g, '');
    if (cleanCode.length !== 6) {
      found.code = 'The code has 6 digits';
    }
    const pwdValidation = validatePassword(password);
    if (pwdValidation !== true) {
      found.password = typeof pwdValidation === 'string' ? pwdValidation : 'Choose a valid new password';
    }

    if (Object.keys(found).length > 0) {
      setProblems(found);
      return;
    }

    setBusy(true);
    setNotice(null);
    setProblems({});
    try {
      await resetPasswordWithCode({ identifier, code: cleanCode, newPassword: password });
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

  return (
    <div className="nl-auth">
      <Backdrop />

      <div className="nl-auth__bar">
        <Button
          variant="ghost"
          icon={mode === 'dark' ? 'sun' : 'moon'}
          aria-label={mode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          onClick={toggleColorMode}
        />
      </div>

      <main className="nl-auth__main">
        <Card className="nl-auth__card">
          <Link to="/" className="nl-auth__brand" aria-label="Murzak POS, go to Home">
            <img src={logoMark} alt="" className="nl-auth__logo" />
            <span className="nl-auth__name">Murzak POS</span>
          </Link>

          {step !== 'done' && (
            <>
              <h1 className="nl-auth__title">
                {step === 'request' ? 'Reset your password' : 'Enter your code'}
              </h1>
              <p className="nl-auth__subtitle">
                {step === 'request'
                  ? 'Type the email address or phone number on your account. We will email you a 6-digit code.'
                  : `We sent the code to the email address on the account for ${identifier}.`}
              </p>
            </>
          )}

          {notice && (
            <div
              className={`nl-auth__${notice.severity === 'info' ? 'note' : 'alert'}`}
              role={notice.severity === 'info' ? 'status' : 'alert'}
            >
              <Icon name={notice.severity === 'info' ? 'info' : 'alert'} />
              <div className="nl-auth__alert-text">
                <span>{notice.text}</span>
                {notice.requirements?.length > 0 && (
                  <div style={{ marginTop: 'var(--space-1)', fontSize: 'var(--caption-size)' }}>
                    Your password still needs: {notice.requirements.join('; ')}.
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="small"
                icon="x"
                aria-label="Dismiss notice"
                onClick={() => setNotice(null)}
              />
            </div>
          )}

          {step === 'request' && (
            <form className="nl-auth__form" onSubmit={sendCode} noValidate>
              <Field
                id="nl-forgot-id"
                label="Email or phone number"
                autoComplete="username"
                value={loginId}
                onChange={(val) => {
                  setLoginId(val);
                  if (problems.loginId) setProblems((p) => ({ ...p, loginId: undefined }));
                }}
                error={problems.loginId}
                disabled={busy}
              />
              <Button type="submit" size="till" loading={busy} className="nl-auth__submit">
                Email me a code
              </Button>
            </form>
          )}

          {step === 'reset' && (
            <form className="nl-auth__form" onSubmit={resetPassword} noValidate>
              <Field
                id="nl-forgot-code"
                className="nl-auth__code"
                label="6-digit code"
                autoComplete="one-time-code"
                value={code}
                onChange={(val) => {
                  setCode(val.replace(/\D/g, '').slice(0, 6));
                  if (problems.code) setProblems((p) => ({ ...p, code: undefined }));
                }}
                error={problems.code}
                inputMode="numeric"
                disabled={busy}
              />
              <div>
                <Field
                  id="nl-forgot-password"
                  label="New password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(val) => {
                    setPassword(val);
                    if (problems.password) setProblems((p) => ({ ...p, password: undefined }));
                  }}
                  error={problems.password}
                  disabled={busy}
                />
                <PasswordChecklist password={password} />
              </div>
              <Button type="submit" size="till" loading={busy} className="nl-auth__submit">
                Set new password
              </Button>
              <div className="nl-auth__row">
                <button
                  type="button"
                  className="nl-auth__link"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  onClick={() => {
                    setStep('request');
                    setNotice(null);
                  }}
                >
                  Use a different email
                </button>
                <button
                  type="button"
                  className="nl-auth__link"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  onClick={resend}
                  disabled={busy}
                >
                  Send a new code
                </button>
              </div>
            </form>
          )}

          {step === 'done' && (
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'var(--soft)',
                  color: 'var(--good)',
                  margin: '0 auto var(--space-4)',
                }}
              >
                <Icon name="check" />
              </div>
              <h1 className="nl-auth__title">Password changed</h1>
              <p className="nl-auth__subtitle" style={{ margin: 'var(--space-2) 0 var(--space-6)' }}>
                You can now sign in with your new password. For your safety, any other devices that were signed in have been signed out.
              </p>
              <Button
                size="till"
                className="nl-auth__submit"
                onClick={() => navigate('/login', { replace: true })}
              >
                Go to sign in
              </Button>
            </div>
          )}

          {step !== 'done' && (
            <div className="nl-auth__switch">
              <Link to="/login" className="nl-auth__link">
                &larr; Back to sign in
              </Link>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
};

export default ForgotPassword;
