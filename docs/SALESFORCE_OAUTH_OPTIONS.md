# Salesforce OAuth options for PowerQuotePro (build both)

This doc outlines **two viable approaches**. We can implement both behind a toggle and choose per-environment.

## Option A — OAuth 2.0 Web Server Flow (Authorization Code)
**Best when:** you want an admin to connect PowerQuotePro to Salesforce interactively via browser.

### How it works
1. Admin clicks **Connect Salesforce**
2. Redirect to Salesforce login/consent
3. Salesforce redirects back with `code`
4. Backend exchanges `code` for:
   - `access_token`
   - `refresh_token` (if configured)
5. Store tokens securely, refresh on expiry.

### Pros
- Most common + easiest for admin UX
- Supports fine-grained scopes
- Works well with multi-org setups

### Cons
- Requires redirect URL management
- Requires secure token storage + refresh handling

### Required Salesforce settings (Connected App)
- Enable OAuth settings
- Callback URL: `https://powerquote-pulse-pro.vercel.app/api/salesforce/oauth/callback` (example)
- Scopes (typical): `api`, `refresh_token` (or `offline_access` depending on org)
- Refresh token policy set to allow long-lived refresh where appropriate

---

## Option B — OAuth 2.0 JWT Bearer Flow (Server-to-Server)
**Best when:** you want a **non-interactive** integration (scheduled sync) using a dedicated integration user.

### How it works
1. Backend signs a JWT with a private key
2. Salesforce token endpoint returns an access token
3. No interactive login; no refresh token stored.

### Pros
- Great for scheduled jobs / headless sync
- No consent screen, no refresh tokens

### Cons
- Requires certificate/private key management
- Usually tied to a specific integration user

### Required Salesforce settings
- Connected App configured for JWT bearer
- Upload certificate (public key)
- Integration user with correct permissions

---

## Implementation plan (PowerQuotePro)
- Add backend endpoints for both flows
- Add admin UI toggle for connection mode
- Store config in `app_settings.salesforce_connection_config`
- Add a **real Test Connection** that performs a token request and a lightweight API call (e.g., `GET /services/data/vXX.X/`) and logs the result.
