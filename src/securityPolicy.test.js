// The build step in scripts/add-security-policy.js, which the deploy workflow runs
const { apiOrigin, buildPolicy, addPolicy } = require('../scripts/add-security-policy');

const page = '<!doctype html><html><head><meta charset="utf-8"/><title>x</title></head><body>'
  + '<script defer="defer" src="/static/js/main.js"></script></body></html>';

test('allows data to go only to the app itself and its API', () => {
  expect(apiOrigin('https://api.murzaktech.tech/api/method')).toBe('https://api.murzaktech.tech');
  expect(buildPolicy('https://api.murzaktech.tech/api/method')).toContain(
    "connect-src 'self' https://api.murzaktech.tech;"
  );
  // Shop sites call their own /api, which is the same site
  expect(apiOrigin('/api/method')).toBeNull();
  expect(buildPolicy('/api/method')).toContain("connect-src 'self';");
});

test('runs only the app\'s own scripts', () => {
  const policy = buildPolicy('/api/method');
  expect(policy).toContain("script-src 'self';");
  expect(policy).not.toContain('unsafe-eval');
  expect(policy).toContain("object-src 'none'");
});

test('places the policy right after the charset', () => {
  const html = addPolicy(page, buildPolicy('/api/method'));
  expect(html).toMatch(/<meta charset="utf-8"\/><meta http-equiv="Content-Security-Policy" content="default-src 'self';/);
});

test('refuses a page with an inline script, which the policy would block', () => {
  const inline = page.replace('<title>', '<script>window.x=1</script><title>');
  expect(() => addPolicy(inline, buildPolicy('/api/method'))).toThrow(/INLINE_RUNTIME_CHUNK/);
});

test('refuses to add a second policy', () => {
  const once = addPolicy(page, buildPolicy('/api/method'));
  expect(() => addPolicy(once, buildPolicy('/api/method'))).toThrow(/already/);
});
