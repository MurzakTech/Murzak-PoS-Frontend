#!/usr/bin/env node
/**
 * Adds a Content Security Policy to a production build's index.html.
 *
 * The policy tells the browser to run only the app's own code and to send data
 * only to the app's own server and its API, so a script slipped into the page
 * cannot load more code or send login tokens elsewhere.
 *
 * Usage (after `npm run build`, built with INLINE_RUNTIME_CHUNK=false):
 *   REACT_APP_API_URL=https://api.example.com/api/method node scripts/add-security-policy.js build
 *
 * Headers only a web server can send (stopping other sites from framing the
 * till, forcing HTTPS) are in deploy/nginx/security-headers.conf.
 */
const fs = require('fs');
const path = require('path');

const buildDir = process.argv[2] || 'build';
const indexPath = path.join(buildDir, 'index.html');

// The API's origin (scheme + host), when it lives on another host than the app
const apiOrigin = (apiUrl) => {
  if (!apiUrl || !/^https?:\/\//i.test(apiUrl)) return null; // relative: same origin as the app
  return new URL(apiUrl).origin;
};

const buildPolicy = (apiUrl) => {
  const connect = ["'self'", apiOrigin(apiUrl)].filter(Boolean).join(' ');
  return [
    "default-src 'self'",
    "script-src 'self'",
    // MUI writes its styles into <style> tags at runtime
    "style-src 'self' 'unsafe-inline'",
    // Product photos can be any https address a shop owner pastes in
    'img-src \'self\' data: blob: https:',
    "font-src 'self' data:",
    `connect-src ${connect}`,
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
};

const addPolicy = (html, policy) => {
  // An inline script would be blocked by script-src 'self' and the app would not start
  const inline = html.match(/<script(?![^>]*\bsrc=)[^>]*>/i);
  if (inline) {
    throw new Error(
      `index.html has an inline script (${inline[0]}). Build with INLINE_RUNTIME_CHUNK=false.`
    );
  }
  if (html.includes('http-equiv="Content-Security-Policy"')) {
    throw new Error('index.html already has a Content-Security-Policy.');
  }
  const meta = `<meta http-equiv="Content-Security-Policy" content="${policy}">`;
  if (!/<meta charset="utf-8"\s*\/?>/i.test(html)) {
    throw new Error('Could not find <meta charset="utf-8"> to place the policy after.');
  }
  return html.replace(/(<meta charset="utf-8"\s*\/?>)/i, `$1${meta}`);
};

module.exports = { apiOrigin, buildPolicy, addPolicy };

if (require.main === module) {
  try {
    const html = fs.readFileSync(indexPath, 'utf8');
    const policy = buildPolicy(process.env.REACT_APP_API_URL);
    fs.writeFileSync(indexPath, addPolicy(html, policy));
    console.log(`Added Content-Security-Policy to ${indexPath}:\n  ${policy}`);
  } catch (error) {
    console.error(`add-security-policy: ${error.message}`);
    process.exit(1);
  }
}
