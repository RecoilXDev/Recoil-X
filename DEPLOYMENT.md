# RECOIL X — GitHub + Alwaysdata deployment

The game is served from `index.html` via GitHub Pages at
https://recoilxdev.github.io/Recoil-X/ .

The server runs on Alwaysdata at https://recoil-x.alwaysdata.net/
from `/home/recoil-x/recoilx-server`. The server's HTTP entry point is
`server/server.mjs`. Node.js **24 or later** is required for built-in SQLite.

The GitHub Actions workflow lives at
`.github/workflows/deploy-alwaysdata.yml`. It uploads the game page,
uploads the server files without deleting the live SQLite database,
runs `npm install --omit=dev`, and restarts the site via the Alwaysdata API.
A production deployment interrupts connected rooms, so avoid updating
during an active match.

## One-time security setup

In GitHub repository **Settings → Secrets and variables → Actions**:

1. Create a dedicated SSH key using `ssh-keygen -t ed25519 -f "$HOME/.ssh/recoilx_deploy" -N ""`
   in Windows PowerShell. Add the content of `recoilx_deploy.pub` to
   **Alwaysdata → Remote access → SSH/SFTP → SSH keys** for user `recoil-x`.
2. Create repository secret `ALWAYSDATA_SSH_KEY` containing the *private*
   key. Never commit it or share it in chat.
3. Create repository secret `ALWAYSDATA_SSH_KNOWN_HOSTS` using the
   verified `ssh-recoil-x.alwaysdata.net` entry from your Windows
   `$HOME/.ssh/known_hosts` file. Verify the host fingerprint against
   Alwaysdata's SSH/SFTP page first; do not blindly trust an arbitrary key.
4. Generate a dedicated API key in Alwaysdata admin. Store it as GitHub
   repository secret `ALWAYSDATA_API_KEY`. Never commit it.
5. Find your RECOIL X website's numeric Alwaysdata Site ID in the
   site edit URL or Alwaysdata API. Add repository *variable*
   `ALWAYSDATA_SITE_ID` with that number.
6. Add repository *variable* `RECOIL_X_DEPLOY_ENABLED` = `true`.
   Until this variable is set, workflows are intentionally skipped.
7. Go to **GitHub → Actions → Deploy RECOIL X to Alwaysdata →
   Run workflow** and review the logs.

After setup, pushes to `main` that update `index.html`, `server/**`,
or the deployment workflow trigger a production deployment automatically.

## Safety

- The live `recoil-x.sqlite` and `node_modules` are never deleted by
  `rsync`. No `--delete` option is used.
- Private keys, local environment files, logs, and database files are
  excluded by `.gitignore`.
- The server allows the GitHub Pages origin by default, in addition to
  same-origin clients. You can override `RX_ORIGINS` with a comma-separated
  list.
- Alwaysdata `IP` / `HOST` and `PORT` are used when available,
  keeping local development at 127.0.0.1:8787.
- Keep the Alwaysdata **Web → Sites** working directory set to
  `recoilx-server`, with startup command `npm start`.
- Repository is public: never put passwords, private keys, or SQLite
  account files in it.

References:
- https://help.alwaysdata.com/en/docs/web-hosting/languages/nodejs/configuration/
- https://help.alwaysdata.com/en/docs/development/api/
- https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions

## Update A — hosting security checklist
The in-process API concurrency limit defaults to 48 (RX_MAX_HTTP), excludes health checks, and returns 503 with Retry-After when full. Keep the existing database and deployment regression gate. This is application protection, not upstream DDoS filtering. At the hosting control panel, verify TLS, supported edge request/connection limits and origin restrictions without blocking WebSocket upgrades or trusting arbitrary forwarded-IP headers. Use a separately configured staging site and database for load testing, then measure legitimate API, login, reconnect and WebSocket traffic before tuning capacity. Edge protection and recovery procedures need provider-side configuration and access; do not claim these have been enabled simply because this commit is deployed.
