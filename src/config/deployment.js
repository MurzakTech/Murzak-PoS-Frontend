// Which deployment this bundle was built for.
//
// The same source ships twice (see .github/workflows/deploy.yml):
//
//   shared   pos.murzaktech.tech — one backend, anyone can sign up.
//   tenant   <shop>.pos.murzaktech.tech — one private backend per paying
//            customer, provisioned by murzaktech.tech at checkout. The owner
//            account is created at provisioning time, so public sign-up is
//            closed (the front door also refuses register_user) and the
//            marketing landing page has no audience.
//
// Set with REACT_APP_TENANT_MODE=true at build time.
export const IS_TENANT_BUILD = process.env.REACT_APP_TENANT_MODE === 'true';

// Where a shop owner finds their login and manages their subscription.
export const MURZAK_PORTAL_URL = 'https://murzaktech.tech/portal';

// Whether a new business can sign itself up here. Each business now gets its own site, built by
// murzaktech.tech at checkout, so sign-up is closed on the shared site too and its sign-up addresses send
// people to the website. The shops already on the shared site keep signing in as before.
// A staging build can open it with REACT_APP_SIGNUP_OPEN=true; the backend must allow it as well
// ("murzak_pos_signup_open": 1 in that site's site_config.json).
export const SIGNUP_OPEN = !IS_TENANT_BUILD && process.env.REACT_APP_SIGNUP_OPEN === 'true';

// Where a new business signs up instead.
export const MURZAK_SIGNUP_URL = 'https://murzaktech.tech';
