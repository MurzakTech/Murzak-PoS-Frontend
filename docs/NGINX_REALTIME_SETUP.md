# Server setup for live updates (Nginx)

**For:** whoever has administrator access to the web server (Nginx) that serves the Murzak POS website.
**Time:** about 15 minutes. **Risk:** low, and easy to undo (see "Undoing it" at the end).

## What this is and why it is needed

The till now listens for short live messages from the server ("a payment was confirmed", "a kitchen ticket is ready", "a bill was held on another till") so that screens update at once instead of at the next check. The messages travel over a live connection that the till opens **to its own address**, for example `https://pos.murzaktech.tech`. The web server has to pass that connection on to the backend. Until it does, the connection quietly fails and the till works exactly as before, checking every few seconds. Nothing is lost; it is only slower.

This is the part only someone with access to the web server can do. The deployment from GitHub copies the website's files and does not touch the web server's settings.

## What you need first

- You can sign in to the web server and run `sudo`.
- The backend has the live messages switched on (the `murzak_pos` release, backend pull request #25, and its Frappe socket server running). If the backend is not released yet, you can still do this setup; it just has no effect until then.
- You know, for each address below, **which Frappe site it talks to** (see step 3).

| Address | What it serves | Nginx folder |
|---|---|---|
| `pos.murzaktech.tech` | The shared till | `/var/www/pos/` |
| `<shop>.pos.murzaktech.tech` | One private till per paying shop | `/var/www/pos-tenant/` |

## Steps

### 1. Allow upgrading to a WebSocket (once for the whole server)

Create `/etc/nginx/conf.d/websocket-upgrade.conf` with exactly this (it sits in the `http` part of Nginx, outside any `server` block). If a `map $http_upgrade $connection_upgrade` already exists anywhere, skip this step, because a second copy makes Nginx refuse to start:

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}
```

### 2. Create the rules file

Copy `deploy/nginx/realtime-proxy.conf` from this repository to the server as `/etc/nginx/snippets/murzak-realtime-proxy.conf`:

```bash
sudo cp realtime-proxy.conf /etc/nginx/snippets/murzak-realtime-proxy.conf
```

Open it and check the two `proxy_pass` lines. `127.0.0.1:9000` is the Frappe **socket server** and `127.0.0.1:8000` the Frappe **web server**. If the backend runs on a different machine from this Nginx, put that machine's address there instead.

### 3. Include it in each address

Inside **each** `server { ... }` block for `pos.murzaktech.tech` and for the shop addresses, add two lines, next to the security headers line:

```nginx
set $frappe_site api.pos.murzaktech.tech;
include /etc/nginx/snippets/murzak-realtime-proxy.conf;
```

- For `pos.murzaktech.tech` use exactly the value above: `api.pos.murzaktech.tech` is the backend's site name.
- **For a shop address, use that shop's own Frappe site name**, the same name that shop's existing rule for `/api` already sends to Frappe. If you are not sure, look at that rule first; do not guess, because the wrong name makes the live connection fail for that shop (it then falls back to checking every few seconds, so nothing breaks).

### 4. Check, then reload

```bash
sudo nginx -t && sudo systemctl reload nginx
```

`nginx -t` must say "syntax is ok" and "test is successful" before the reload runs. If it does not, nothing has changed: read the message, fix the line it names, and try again.

### 5. Confirm it worked

From any computer, for each address:

```bash
curl -s "https://pos.murzaktech.tech/socket.io/?EIO=4&transport=polling"
```

- **Working:** the reply is a short line that starts with `0{"sid":` (the socket server saying hello).
- **Not working:** you get the till's web page (it starts with `<!doctype html>`), a "404" or a "502". The first means the `location /socket.io/` rule is not being used (check the `include` is inside the right `server` block); a 502 means Nginx cannot reach the socket server (check the address in step 2 and that the socket server is running).

These expected replies come from how Frappe's socket server normally answers; they have not been run against the live server from here, so tell us if the reply looks different.

Then the real test, with two tills of one business signed in:

1. Hold a bill on the first till. It should appear on the second within a second or two.
2. Send a small test M-Pesa payment from the till. It should confirm within a second or two, without waiting for the next check.

## Undoing it

Delete the `set` and `include` lines from each `server` block, then run `sudo nginx -t && sudo systemctl reload nginx`. The tills go back to checking every few seconds, which is how they worked before.

## How it was set up on the production server (11 October 2026)

This section records the real file names and values, so the setup can be checked or repeated.

| Address | File edited | Lines added |
|---|---|---|
| `pos.murzaktech.tech` (shared till) | `/etc/nginx/conf.d/pos_frontend.conf`, in the first `server` block (the `listen 443` one), after `index index.html;` | `set $frappe_site api.pos.murzaktech.tech;` and `include /etc/nginx/snippets/murzak-realtime-proxy.conf;` |
| `<shop>.pos.murzaktech.tech` (every shop) | `/etc/nginx/sites-available/pos-tenants-wildcard`, in the 443 `server` block, after `set $murzak_pos_site ...;` | `set $frappe_site $murzak_pos_site;` and the same `include` |

- **The map.** `/etc/nginx/conf.d/websocket-upgrade.conf` defines `$connection_upgrade`. The server already had a similar map with a different name (`$murzak_apps_connection_upgrade`, for the apps sites), so the two do not clash.
- **Shops need no per-shop edit.** The shop block already works out each shop's Frappe site from its address (`<shop>.erp.murzaktech.tech`) and keeps it in `$murzak_pos_site`, so one pair of lines covers every present and future shop.
- **The Frappe programs** are on the same server: the web program on `127.0.0.1:8000` and the live-connection program on port `9000`, so the addresses in the rules file were used unchanged.
- **The shop guard does not interfere.** `snippets/murzak-pos-guard.conf` only acts on `/api/method/techsavanna_pos.…` requests. The live connection (`/socket.io/`) and the sign-in check (`/api/method/frappe.realtime.get_user_info`) do not match, so the guard leaves them alone.

### What was checked

- Shared till, `/socket.io/`: `HTTP/2 200` with a body starting `0{"sid":` and `"upgrades":["websocket"]`.
- Shared till, sign-in check: a JSON reply from the backend (a Guest session), not the web page.
- Shop address, `/socket.io/`: `HTTP/2 200`, `text/plain`, the same reply, with the shop block's security headers present. No shop sites existed yet, so a made-up shop name was used.
- Shop address, sign-in check: Frappe's "not found" for a shop that does not exist. That shows the request reached the backend pinned to the shop's site name. It should be repeated against a real shop once one is provisioned.

### Shop guard after the app rename (done 11 October 2026)

`/etc/nginx/conf.d/00-murzak-pos-guard-map.conf` matched only `techsavanna_pos.` in method names, so once the backend was renamed to `murzak_pos` the guard would have silently stopped protecting the shops. Every pattern now accepts either name (`(techsavanna_pos|murzak_pos)`). The `techsavanna_pos|` part can be dropped once no site uses the old name.

The same change opened exactly two more doors before sign-in, on purpose, so shop staff can reset their own password: `password_reset.request_password_reset` and `password_reset.reset_password_with_code`. They are safe to expose because the backend rate limits them, answers the same whether or not an account exists, sends the code only to the address on the account, and locks after wrong guesses. A shop needs a default outgoing Email Account and a working email address on each staff account for the code to arrive.

Checked on the server (against a made-up shop name, since the guard decides before the shop is looked up): both reset methods pass the guard; any other method in that module still answers `401 Please sign in to continue.`; `register_user` still answers `403`.

### Port 9000 (checked 11 October 2026)

The Frappe live-connection program listens on all network addresses (`*:9000`), but the firewall (`sudo ufw status verbose`) shows `Default: deny (incoming)` with only ports 22, 80, 443 and 8010 allowed, so port 9000 cannot be reached from outside. The tills reach it only through Nginx on 443.

### Still to do

- **Docker ports and the firewall.** Port 8010 is published by a Docker container (`docker-proxy`) and is allowed through the firewall. Docker adds its own network rules in front of `ufw`, so any other port a container publishes is reachable from outside even if `ufw` does not list it. List the containers (`sudo docker ps`) and the outward-facing ports (`sudo ss -ltn | grep -v '127.0.0'`) and confirm each is expected.
- **Real-shop test.** Once a shop exists, repeat the two checks above against it, then do the two-till test in step 5.
