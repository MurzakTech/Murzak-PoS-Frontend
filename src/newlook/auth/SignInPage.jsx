import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button, Card, Checkbox, Field, Icon } from '../components';
import { useThemeMode } from '../../theme/ThemeProvider';
import { classifyLoginId, looksLikePhone } from '../../utils/phone';
import { IS_TENANT_BUILD, MURZAK_PORTAL_URL } from '../../config/deployment';
import logoMark from '../../assets/logo_mark.png';
import useSignIn from './useSignIn';
import { plainSignInError } from './signInErrors';
import T from './strings.auth';
import './auth.css';

const IDS = { loginId: 'nl-auth-id', password: 'nl-auth-password', code: 'nl-auth-code' };

const focusById = (id) => {
  const element = document.getElementById(id);
  if (element) {
    element.focus();
    if (typeof element.select === 'function') element.select();
  }
};

const onlyDigits = (text) => String(text || '').replace(/\D/g, '').slice(0, 6);

/**
 * The Sign-in page in the New look (ticket P5-5, acceptance check AC-35): one card, the same tokens and components as the rest of
 * the redesign, a clear error in plain words, and a light or dark theme toggle that is remembered.
 *
 * It is shown by src/pages/Login.js only when this device last learned that the shop's New look is on (see deviceFlag.js). The way a
 * person is signed in is not here: useSignIn runs the same steps as the current page.
 */
const SignInPage = () => {
  const location = useLocation();
  const { mode, toggleColorMode } = useThemeMode();
  const { isLoading, error, step, submitPassword, submitCode, backToPassword, dismissError } = useSignIn();

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState('');
  // Problems found before sending: { loginId, password, code } with a sentence each
  const [problems, setProblems] = useState({});

  const sentence = error ? plainSignInError(error, { step }) : null;
  const idle = !error && new URLSearchParams(location.search).get('reason') === 'idle';

  // Focus follows the step: the first box when the page opens or when going back, the code box once a code is wanted
  useEffect(() => {
    focusById(step === 'code' ? IDS.code : IDS.loginId);
  }, [step]);

  // When the sign-in is refused, focus goes to the thing to fix (the password box, the code box, or the first box when nothing is wrong with a box)
  const lastError = useRef(null);
  useEffect(() => {
    if (error && error !== lastError.current) {
      const field = sentence.field || (step === 'code' ? 'code' : 'loginId');
      focusById(IDS[field]);
    }
    lastError.current = error;
  }, [error, sentence, step]);

  const phone = looksLikePhone(loginId);

  const onSubmitPassword = async (event) => {
    event.preventDefault();
    if (isLoading) return;
    const found = {};
    if (!loginId.trim()) found.loginId = T.check.loginIdEmpty;
    else if (classifyLoginId(loginId).type === null) found.loginId = T.check.loginIdBad;
    if (!password) found.password = T.check.passwordEmpty;
    setProblems(found);
    const first = ['loginId', 'password'].find((key) => found[key]);
    if (first) {
      focusById(IDS[first]);
      return;
    }
    await submitPassword({ loginId, password });
  };

  const onSubmitCode = async (event) => {
    event.preventDefault();
    if (isLoading) return;
    if (code.length !== 6) {
      setProblems({ code: T.check.codeShort });
      focusById(IDS.code);
      return;
    }
    setProblems({});
    const outcome = await submitCode(code);
    if (outcome === 'code-needed') setCode('');
  };

  const goBack = () => {
    setCode('');
    setPassword('');
    setProblems({});
    backToPassword();
  };

  const change = (setter, key) => (value) => {
    setter(value);
    if (problems[key]) setProblems({ ...problems, [key]: undefined });
  };

  const serverField = sentence ? sentence.field : null;

  return (
    <div className="nl-auth">
      <div className="nl-auth__bar">
        <Button variant="ghost" icon={mode === 'dark' ? 'sun' : 'moon'} aria-label={mode === 'dark' ? T.theme.toLight : T.theme.toDark} onClick={toggleColorMode} />
      </div>

      <main className="nl-auth__main">
        <Card className="nl-auth__card">
          <Link to="/" className="nl-auth__brand" aria-label={T.homeLabel}>
            <img src={logoMark} alt="" className="nl-auth__logo" />
            <span className="nl-auth__name">{T.brand}</span>
          </Link>

          <h1 className="nl-auth__title" id="nl-auth-title">
            {step === 'code' ? T.code.title : T.signIn.title}
          </h1>
          <p className="nl-auth__subtitle">{step === 'code' ? T.code.intro : T.signIn.subtitle}</p>

          {idle ? (
            <p className="nl-auth__note" role="status">
              <Icon name="info" />
              <span>{T.signIn.signedOutIdle}</span>
            </p>
          ) : null}

          {sentence ? (
            <div className="nl-auth__alert" role="alert">
              <Icon name="alert" />
              <span className="nl-auth__alert-text">{sentence.text}</span>
              <Button variant="ghost" size="small" icon="x" aria-label={T.errors.dismiss} onClick={dismissError} />
            </div>
          ) : null}

          {step === 'code' ? (
            <form className="nl-auth__form" onSubmit={onSubmitCode} noValidate aria-labelledby="nl-auth-title">
              <Field
                id={IDS.code}
                className="nl-auth__code"
                label={T.code.label}
                helper={T.code.hint}
                value={code}
                onChange={change((value) => setCode(onlyDigits(value)), 'code')}
                error={problems.code || (serverField === 'code' ? T.check.codeMarked : undefined)}
                inputMode="numeric"
                autoComplete="one-time-code"
                spellCheck={false}
              />
              <Button type="submit" size="till" loading={isLoading} className="nl-auth__submit">
                {isLoading ? T.code.submitting : T.code.submit}
              </Button>
              <Button variant="secondary" size="till" onClick={goBack} disabled={isLoading}>
                {T.code.back}
              </Button>
              <p className="nl-auth__small">{T.code.lost}</p>
            </form>
          ) : (
            <form className="nl-auth__form" onSubmit={onSubmitPassword} noValidate aria-labelledby="nl-auth-title">
              <Field
                id={IDS.loginId}
                label={T.signIn.loginId}
                helper={phone ? T.signIn.loginIdPhoneHint : undefined}
                value={loginId}
                onChange={change(setLoginId, 'loginId')}
                error={problems.loginId}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
              <Field
                id={IDS.password}
                type={showPassword ? 'text' : 'password'}
                label={T.signIn.password}
                value={password}
                onChange={change(setPassword, 'password')}
                error={problems.password || (serverField === 'password' ? T.check.passwordMarked : undefined)}
                autoComplete="current-password"
              />
              <div className="nl-auth__row">
                <Checkbox label={T.signIn.showPassword} checked={showPassword} onChange={setShowPassword} />
                <Link to="/forgot-password" state={{ loginId }} className="nl-auth__link">
                  {T.signIn.forgot}
                </Link>
              </div>
              <Button type="submit" size="till" loading={isLoading} className="nl-auth__submit">
                {isLoading ? T.signIn.submitting : T.signIn.submit}
              </Button>
            </form>
          )}

          <div className="nl-auth__switch">
            {IS_TENANT_BUILD ? (
              <>
                <p>{T.footer.ownerLogin}</p>
                <a href={MURZAK_PORTAL_URL} className="nl-auth__link">
                  {T.footer.portal}
                </a>
              </>
            ) : (
              <>
                <p>{T.footer.newHere}</p>
                <Link to="/register" className="nl-auth__link">
                  {T.footer.create}
                </Link>
              </>
            )}
          </div>
        </Card>

        <div className="nl-auth__legal">
          <p>{T.footer.termsIntro}</p>
          <div className="nl-auth__legal-links">
            <Link to="/terms-of-service" className="nl-auth__link">
              {T.footer.terms}
            </Link>
            <Link to="/privacy-policy" className="nl-auth__link">
              {T.footer.privacy}
            </Link>
          </div>
          <p>{T.footer.help}</p>
          <div className="nl-auth__legal-links">
            <a href={`mailto:${T.footer.supportEmail}`} className="nl-auth__link">
              {T.footer.supportEmail}
            </a>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SignInPage;
