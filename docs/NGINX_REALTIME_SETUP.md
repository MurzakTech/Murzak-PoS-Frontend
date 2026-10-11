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
