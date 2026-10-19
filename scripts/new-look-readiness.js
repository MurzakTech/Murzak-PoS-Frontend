#!/usr/bin/env node
/*
 * Is this shop's back end ready for the New look?
 *
 * Calls the READ-ONLY server methods the redesigned screens use and reports, for each one, whether the shop's back end has it.
 * It changes nothing: no record is written, and no method that writes is called. It needs no password: give it a read-only
 * API key and secret made for a test user (Frappe, User, API Access), through environment variables only. Nothing is printed
 * that could reveal them.
 *
 *   SHOP_URL=https://shop.example.com SHOP_API_KEY=... SHOP_API_SECRET=... node scripts/new-look-readiness.js
 *
 * Add `--json` for machine-readable output. The exit code is 0 when every method is present and 1 when any is missing, so a
 * rollout checklist can stop on it. A method that answers "not allowed" for this user counts as present (it is installed).
 */
const http = require('http');
const https = require('https');

const API = 'murzak_pos.api';
// Each entry: module.method. Only methods that read.
const METHODS = [
  'new_look_api.get_new_look',
  'dashboard_overview.get_overview',
  'dashboard_overview.get_products_without_cost',
  'payment_methods_api.get_payment_methods',
  'payment_methods_api.get_till_payment_modes',
  'till_api.get_till_state',
  'sales_list_api.list_sales',
  'customers_list_api.list_customers_overview',
  'customers_list_api.get_customer_form_options',
  'stock_levels_api.get_stock_levels',
  'stock_levels_api.find_products',
  'products_list_api.list_products',
  'products_list_api.list_categories',
  'suppliers_list_api.list_suppliers_overview',
  'purchases_list_api.list_purchases',
  'purchases_list_api.get_payment_modes',
  'expenses_api.get_expense_options',
  'expenses_api.list_expenses',
  'reports_api.list_reports',
  'team_api.list_team',
  'setup_api.get_setup_state',
  'setup_api.get_business_features',
  'language_api.get_languages',
];

const base = process.env.SHOP_URL;
const key = process.env.SHOP_API_KEY;
const secret = process.env.SHOP_API_SECRET;
const asJson = process.argv.includes('--json');

if (process.argv.includes('--help') || !base || !key || !secret) {
  console.log('Usage: SHOP_URL=https://shop SHOP_API_KEY=... SHOP_API_SECRET=... node scripts/new-look-readiness.js [--json]');
  console.log('Set all three variables. Use a read-only test user. Nothing is written to the shop.');
  process.exit(process.argv.includes('--help') ? 0 : 2);
}

const get = (path) =>
  new Promise((resolve) => {
    const url = new URL(path, base);
    const client = url.protocol === 'http:' ? http : https;
    const req = client.get(url, { headers: { Authorization: `token ${key}:${secret}`, Accept: 'application/json' }, timeout: 20000 }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', (e) => resolve({ status: 0, body: String(e.message) }));
  });

// Frappe answers a method that is not there with 404, or 403 "not whitelisted", or an error naming the missing attribute or module
const isMissing = ({ status, body }) => status === 404 || /not whitelisted|has no attribute|No module named|ModuleNotFound/i.test(body) || (status === 403 && /whitelisted/i.test(body));

(async () => {
  const results = [];
  for (const m of METHODS) {
    const [mod, fn] = m.split('.');
    const reply = await get(`/api/method/${API}.${mod}.${fn}`);
    let state = 'present';
    if (reply.status === 0) state = 'unreachable';
    else if (isMissing(reply)) state = 'MISSING';
    else if (reply.status === 401) state = 'sign-in refused (check the key and secret)';
    results.push({ method: m, state, status: reply.status });
  }
  const missing = results.filter((r) => r.state !== 'present');
  if (asJson) console.log(JSON.stringify({ ready: missing.length === 0, results }, null, 2));
  else {
    results.forEach((r) => console.log(`${r.state === 'present' ? 'ok     ' : 'PROBLEM'}  ${r.method}  (${r.status || 'no answer'})${r.state === 'present' ? '' : '  ' + r.state}`));
    console.log(missing.length ? `\n${missing.length} of ${results.length} need attention. Do not switch this shop on yet.` : `\nAll ${results.length} methods are present. The back end is ready.`);
  }
  process.exit(missing.length ? 1 : 0);
})();
