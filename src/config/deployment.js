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
