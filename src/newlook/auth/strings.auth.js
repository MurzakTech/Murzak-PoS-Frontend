/**
 * Every visible word of the redesigned Sign-in page (ticket P5-5). A word with a changing part is one string with {placeholders},
 * filled in with labels/fill.js. No word is written inside a component.
 *
 * Wrong sign-in details always get the SAME words, whatever the reason (wrong password, no such account, account switched off), so
 * the page never tells a stranger whether an email or phone number is registered.
 */
const auth = {
  brand: 'Murzak POS',
  homeLabel: 'Murzak POS home',
  homeLabelShop: '{name} home',

  theme: { toLight: 'Switch to light theme', toDark: 'Switch to dark theme' },

  signIn: {
    title: 'Welcome back',
    subtitle: 'Sign in to your shop.',
    loginId: 'Email or phone number',
    loginIdPhoneHint: 'Any format works: 0712 345 678 or +254 712 345 678',
    password: 'Password',
    showPassword: 'Show password',
    forgot: 'Forgot password?',
    submit: 'Sign in',
    submitting: 'Signing in',
    signedOutIdle: 'You were signed out because the screen was not used for a while. Sign in to carry on.',
  },

  signUp: {
    title: 'Start your shop',
    subtitle: 'Free to start. Ready for your till in seconds.',
    fullName: 'Your full name',
    fullNameHint: 'First and last name, e.g. Sarah Mwangi',
    shopName: 'Shop or business name',
    shopNameHint: 'e.g. Sarah Minimart or Westlands Chemist',
    email: 'Email address',
    emailHint: 'Receipts and account notifications will be sent here',
    phone: 'Phone number',
    phoneHint: 'e.g. 0712 345 678 (optional)',
    password: 'Password',
    passwordHint: 'At least 8 characters with letters, a number & a symbol',
    confirmPassword: 'Confirm password',
    showPassword: 'Show password',
    submit: 'Create shop & get started',
    submitting: 'Setting up your shop...',
    alreadyHaveAccount: 'Already have an account?',
    signIn: 'Sign in to your shop',
    termsIntro: 'By signing up, you agree to our terms and privacy policy.',
  },

  code: {
    title: 'Enter your code',
    intro: 'Two-step sign-in is on for this account. Open your authenticator app and type the 6-digit code shown for Murzak POS.',
    label: '6-digit code',
    hint: 'Numbers only. You can paste the code.',
    submit: 'Verify and sign in',
    submitting: 'Checking the code',
    back: 'Use a different account',
    lost: 'Lost your phone? Ask the business owner to turn off two-step sign-in for you.',
  },

  // Problems found before anything is sent
  check: {
    loginIdEmpty: 'Enter your email address or phone number.',
    loginIdBad: 'Enter your email address, or a Kenyan mobile number like 0712 345 678.',
    passwordEmpty: 'Enter your password.',
    codeShort: 'Enter all 6 digits of the code.',
    passwordMarked: 'Check your password.',
    codeMarked: 'Check the code.',
    fullNameEmpty: 'Enter your full name.',
    fullNameTwoParts: 'Enter both your first and last name (e.g. Sarah Mwangi).',
    shopNameEmpty: 'Enter your shop or business name.',
    emailEmpty: 'Enter your email address.',
    emailBad: 'Enter a valid email address like name@example.com.',
    phoneBad: 'Enter a valid Kenyan mobile number like 0712 345 678, or leave it blank.',
    passwordComplexity: 'Password must be at least 8 characters and include uppercase, lowercase, a number, and a symbol (!@#$).',
    confirmPasswordEmpty: 'Confirm your password.',
    passwordMismatch: 'Passwords do not match.',
  },

  // What went wrong, in plain words, and what to do next. These replace whatever the server said.
  errors: {
    credentials: 'That email, phone number or password is not right. Check them and try again.',
    code: 'That code is not right. Open your authenticator app and type the newest code.',
    lockedMinutes: 'Too many wrong tries. Wait {minutes} minutes, then try again. Or choose Forgot password to set a new one.',
    lockedOneMinute: 'Too many wrong tries. Wait 1 minute, then try again. Or choose Forgot password to set a new one.',
    locked: 'Too many wrong tries. Wait a few minutes, then try again. Or choose Forgot password to set a new one.',
    tooMany: 'Too many tries in a short time. Wait a minute and try again.',
    offline: 'You are offline. Check your internet connection and try again.',
    network: 'We could not reach Murzak. Check your internet connection and try again.',
    slow: 'Murzak is taking too long to answer. Try again in a moment.',
    busy: 'Murzak is busy or being updated. Try again in a minute.',
    server: 'Something went wrong on our side. Try again in a minute, and email support if it keeps happening.',
    other: 'We could not sign you in. Try again, and email support if it keeps happening.',
    signUpFailed: 'Could not create your shop account. Please check your information and try again.',
    dismiss: 'Dismiss this message',
  },

  footer: {
    newHere: 'New to Murzak POS?',
    create: 'Create your free account',
    getShop: 'Get your own shop at murzaktech.tech',
    ownerLogin: 'Your owner login is in your Murzak portal. Staff accounts are added by the owner from inside the POS.',
    portal: 'Open the Murzak portal',
    termsIntro: 'By signing in, you agree to our terms and privacy policy.',
    terms: 'Terms of Service',
    privacy: 'Privacy Policy',
    help: 'Need help?',
    supportEmail: 'murzaktechnologies@gmail.com',
  },
};

export default auth;
