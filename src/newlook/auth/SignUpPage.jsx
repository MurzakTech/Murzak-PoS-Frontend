import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, Checkbox, Field, Icon } from '../components';
import { useThemeMode } from '../../theme/ThemeProvider';
import { isValidKenyanMobile } from '../../utils/phone';
import logoMark from '../../assets/logo_mark.png';
import { productImageUrl } from '../../utils/productArt';
import { applyAccent, readDeviceBrand } from '../brand/deviceBrand';
import Backdrop from '../brand/Backdrop';
import useSignUp from './useSignUp';
import { plainSignUpError } from './signUpErrors';
import fill from '../labels/fill';
import T from './strings.auth';
import './auth.css';

const IDS = {
  fullName: 'nl-signup-name',
  shopName: 'nl-signup-shop',
  email: 'nl-signup-email',
  phone: 'nl-signup-phone',
  password: 'nl-signup-password',
  confirmPassword: 'nl-signup-confirm-password',
};

const focusById = (id) => {
  const element = document.getElementById(id);
  if (element) {
    element.focus();
    if (typeof element.select === 'function') element.select();
  }
};

const EMAIL_PATTERN = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

/**
 * Modern non-MUI Sign-Up page for SaaS self-onboarding.
 *
 * Captures account & business information:
 * - Full name (first and last name)
 * - Shop / Business name
 * - Email address
 * - Mobile phone (optional)
 * - Password & confirmation (validated against backend security policy: >= 8 chars, mixed case, number, symbol)
 *
 * Automatically provisions default tenant setup (Company, POS Profile, default Warehouse & Accounts)
 * and navigates to the POS home screen with the SetupWizard available for optional deep setup.
 */
const SignUpPage = () => {
  const { mode, toggleColorMode } = useThemeMode();
  const shop = useMemo(() => readDeviceBrand(), []);
  const shopLogo = shop.logo ? productImageUrl({ image: shop.logo }) : null;

  useEffect(() => {
    applyAccent(shop.accent);
  }, [shop.accent]);

  const { isLoading, error, dismissError, submitSignUp } = useSignUp();

  const [fullName, setFullName] = useState('');
  const [shopName, setShopName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [problems, setProblems] = useState({});

  const sentence = error ? plainSignUpError(error) : null;
  const serverField = sentence ? sentence.field : null;

  // When error changes, focus on the relevant field
  const lastError = useRef(null);
  useEffect(() => {
    if (error && error !== lastError.current) {
      const targetField = serverField || 'email';
      if (IDS[targetField]) {
        focusById(IDS[targetField]);
      }
    }
    lastError.current = error;
  }, [error, serverField]);

  const change = (setter, key) => (value) => {
    setter(value);
    if (problems[key]) {
      setProblems((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (isLoading) return;

    const found = {};
    const trimmedName = fullName.trim();
    const trimmedShop = shopName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    const nameParts = trimmedName.split(/\s+/).filter(Boolean);
    if (!trimmedName) {
      found.fullName = T.check.fullNameEmpty;
    } else if (nameParts.length < 2) {
      found.fullName = T.check.fullNameTwoParts;
    }

    if (!trimmedShop) {
      found.shopName = T.check.shopNameEmpty;
    }

    if (!trimmedEmail) {
      found.email = T.check.emailEmpty;
    } else if (!EMAIL_PATTERN.test(trimmedEmail)) {
      found.email = T.check.emailBad;
    }

    if (trimmedPhone && !isValidKenyanMobile(trimmedPhone)) {
      found.phone = T.check.phoneBad;
    }

    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSymbol = /[^A-Za-z0-9\s]/.test(password);

    if (!password) {
      found.password = T.check.passwordEmpty;
    } else if (password.length < 8 || !hasUpper || !hasLower || !hasDigit || !hasSymbol) {
      found.password = T.check.passwordComplexity;
    }

    if (!confirmPassword) {
      found.confirmPassword = T.check.confirmPasswordEmpty;
    } else if (password !== confirmPassword) {
      found.confirmPassword = T.check.passwordMismatch;
    }

    setProblems(found);

    const firstProblemKey = ['fullName', 'shopName', 'email', 'phone', 'password', 'confirmPassword'].find(
      (key) => found[key]
    );

    if (firstProblemKey) {
      focusById(IDS[firstProblemKey]);
      return;
    }

    await submitSignUp({
      fullName: trimmedName,
      shopName: trimmedShop,
      email: trimmedEmail,
      phone: trimmedPhone,
      password,
    });
  };

  return (
    <div className="nl-auth">
      <Backdrop name={shop.backdrop} />
      <div className="nl-auth__bar">
        <Button
          variant="ghost"
          icon={mode === 'dark' ? 'sun' : 'moon'}
          aria-label={mode === 'dark' ? T.theme.toLight : T.theme.toDark}
          onClick={toggleColorMode}
        />
      </div>

      <main className="nl-auth__main">
        <Card className="nl-auth__card">
          <Link
            to="/"
            className="nl-auth__brand"
            aria-label={shop.name ? fill(T.homeLabelShop, { name: shop.name }) : T.homeLabel}
          >
            <img src={shopLogo || logoMark} alt="" className="nl-auth__logo" />
            <span className="nl-auth__name">{shop.name || T.brand}</span>
          </Link>

          <h1 className="nl-auth__title" id="nl-signup-title">
            {T.signUp.title}
          </h1>
          <p className="nl-auth__subtitle">{T.signUp.subtitle}</p>

          {sentence ? (
            <div className="nl-auth__alert" role="alert">
              <Icon name="alert" />
              <span className="nl-auth__alert-text">{sentence.text}</span>
              <Button variant="ghost" size="small" icon="x" aria-label={T.errors.dismiss} onClick={dismissError} />
            </div>
          ) : null}

          <form className="nl-auth__form" onSubmit={onSubmit} noValidate aria-labelledby="nl-signup-title">
            <Field
              id={IDS.fullName}
              label={T.signUp.fullName}
              helper={T.signUp.fullNameHint}
              value={fullName}
              onChange={change(setFullName, 'fullName')}
              error={problems.fullName}
              autoComplete="name"
              spellCheck={false}
              required
            />

            <Field
              id={IDS.shopName}
              label={T.signUp.shopName}
              helper={T.signUp.shopNameHint}
              value={shopName}
              onChange={change(setShopName, 'shopName')}
              error={problems.shopName}
              autoComplete="organization"
              spellCheck={false}
              required
            />

            <Field
              id={IDS.email}
              type="email"
              label={T.signUp.email}
              helper={T.signUp.emailHint}
              value={email}
              onChange={change(setEmail, 'email')}
              error={problems.email || (serverField === 'email' ? sentence?.text : undefined)}
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
            />

            <Field
              id={IDS.phone}
              type="tel"
              label={T.signUp.phone}
              helper={T.signUp.phoneHint}
              value={phone}
              onChange={change(setPhone, 'phone')}
              error={problems.phone || (serverField === 'phone' ? sentence?.text : undefined)}
              autoComplete="tel"
              inputMode="tel"
            />

            <Field
              id={IDS.password}
              type={showPassword ? 'text' : 'password'}
              label={T.signUp.password}
              helper={T.signUp.passwordHint}
              value={password}
              onChange={change(setPassword, 'password')}
              error={problems.password || (serverField === 'password' ? sentence?.text : undefined)}
              autoComplete="new-password"
              required
            />

            <Field
              id={IDS.confirmPassword}
              type={showPassword ? 'text' : 'password'}
              label={T.signUp.confirmPassword}
              value={confirmPassword}
              onChange={change(setConfirmPassword, 'confirmPassword')}
              error={problems.confirmPassword}
              autoComplete="new-password"
              required
            />

            <div className="nl-auth__row">
              <Checkbox label={T.signUp.showPassword} checked={showPassword} onChange={setShowPassword} />
            </div>

            <Button type="submit" size="till" loading={isLoading} className="nl-auth__submit">
              {isLoading ? T.signUp.submitting : T.signUp.submit}
            </Button>
          </form>

          <div className="nl-auth__switch">
            <p>{T.signUp.alreadyHaveAccount}</p>
            <Link to="/login" className="nl-auth__link">
              {T.signUp.signIn}
            </Link>
          </div>
        </Card>

        <div className="nl-auth__legal">
          <p>{T.signUp.termsIntro}</p>
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

export default SignUpPage;
