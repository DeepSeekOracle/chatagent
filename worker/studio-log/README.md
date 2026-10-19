# LYGO Studio Edge

A tiny Cloudflare Worker for the public image studio.

It provides three things the static GitHub Pages site cannot do by itself:

1. **Remote failure log** — `POST /log`, sanitized, stored in Cloudflare KV for 30 days.
2. **Owner-only diagnostics** — `GET /diag`, requires `Authorization: Bearer ADMIN_TOKEN`.
3. **Allowlisted CORS proxy** — `/proxy?url=...`, for image providers that block browser origins.

No API keys, prompts, images, or user identifiers are accepted by `/log`.

## Deploy

```powershell
cd C:\Users\justi\source\chatagent\worker\studio-log
npx wrangler login
npx wrangler kv namespace create FAILURES
# paste the returned id into wrangler.toml
npx wrangler secret put ADMIN_TOKEN
npx wrangler deploy
```

The deploy prints a URL like:

```text
https://lygo-studio-edge.<your-subdomain>.workers.dev
```

Set that as `REMOTE_LOG_URL` in `portal/image-studio.html`:

```js
const REMOTE_LOG_URL="https://lygo-studio-edge.<your-subdomain>.workers.dev/log";
```

Set the proxy URL in the studio's **Settings → Proxy URL** to:

```text
https://lygo-studio-edge.<your-subdomain>.workers.dev/proxy
```

That makes the proxy path `/proxy?url=...`, matching the app's existing CORS helper.

## Read the log

The log is not public. From a trusted machine:

```powershell
$env:ADMIN_TOKEN="...your token..."
Invoke-RestMethod `
  -Uri "https://lygo-studio-edge.<your-subdomain>.workers.dev/diag" `
  -Headers @{ Authorization = "Bearer $env:ADMIN_TOKEN" } |
  Select-Object -ExpandProperty entries |
  Format-Table ts,kind,provider,mode,http,message
```

Never put `ADMIN_TOKEN` in the page, a URL, a repo, or a chat message.

## Security

- `/log` is origin-restricted and capped at 4 KB.
- `/diag` requires the admin token.
- `/proxy` is HTTPS-only and host-allowlisted; it is not an open proxy.
- The Worker forwards provider `Authorization` headers but does not store them.
- Rotate `ADMIN_TOKEN` if it is ever exposed.
