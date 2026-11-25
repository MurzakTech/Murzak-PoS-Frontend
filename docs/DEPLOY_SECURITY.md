# Making sure the deploy talks to your server

## What this protects against

When a deploy copies the new app to your server over SSH, the first thing that happens is the two sides
introduce themselves. Your server shows its **fingerprint**, a short code that identifies it. If nobody checks that
code, a deploy could be sent to the wrong machine (for example after a hijacked domain name or a reassigned address),
and it would carry the app's files and be signed in with your deploy key.

The rsync action we use does not check the code. Its "strict" option only scans the server during the deploy and
trusts the answer, so it adds almost nothing. Instead, the workflow has its own step, **Check the server's identity**,
which compares the fingerprint with one you record once. If they differ, the deploy stops before anything is sent.

## One-time setup (about five minutes)

1. **Read the fingerprint from the server itself.** Log in to the server the way you normally do (or use your hosting
   provider's console) and run:

   ```bash
   ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
   ```

   It prints one line like `256 SHA256:AbCd...xyz root@your-server (ED25519)`. The part you need is the second item,
   the one that starts with `SHA256:`. Do this on the server, not from your own computer over the network, so the value
   cannot have been tampered with on the way.

   If that file does not exist, run `ls /etc/ssh/ssh_host_*_key.pub` and use the files listed (for example
   `ssh_host_ecdsa_key.pub`).

2. **Save it in GitHub.** In this repository open **Settings**, then **Secrets and variables**, then **Actions**, then
   the **Variables** tab, then **New repository variable**.
   - Name: `VPS_HOST_FINGERPRINT`
   - Value: the `SHA256:...` code. To record more than one (for example the ed25519 and the ecdsa one), put each on its
     own line.

3. **Check it works.** Open **Actions**, **Deploy Frontend**, **Run workflow**. In the run, open the step
   **Check the server's identity**. It should say `The server's fingerprint matches the one on record.`

## If something goes wrong

- **The step says the fingerprint is not the one on record, and you have not changed the server.** Do not just
  update the variable. Something may be answering in place of your server. Check the address and tell whoever manages
  the server.
- **You rebuilt or reinstalled the server on purpose.** It has new keys, so repeat step 1 and replace the variable.
- **The step says it could not read the server's host key.** The server was unreachable from the build machine.
  Run the deploy again; if it keeps failing, the server's SSH service is down.
- **You need deploys to work right now and cannot sort it out.** Delete the variable. The step then only prints a
  warning and the deploy continues as it did before.

Until the variable exists, every deploy prints the warning `VPS_HOST_FINGERPRINT is not set`. That is expected.

## What this does not cover

- The check runs just before the rsync action opens its own connection, not inside it. An attacker who could answer
  correctly to the check and differently a moment later could still get through. Closing that gap completely means
  replacing the action with a plain `rsync` command that uses a pinned `known_hosts` file. That is a reasonable next step
  if you want it.
- The backend's deploy (`Murzak-PoS-Backend`) uses a different action that accepts a fingerprint directly. It is
  not set up yet, because it needs the same value and a test run first.
