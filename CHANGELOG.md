# Changelog

## 0.2.1

Corrected the installation architecture so MemFrags reuses an adopter's
existing authenticated private storage rather than prescribing a second backend.

### Changed

- The editor now requires adopters to pass their own authenticated storage route
  explicitly instead of assuming a production path.
- The model-side loader now accepts the portal's existing private load and save
  functions instead of assuming a hosting provider.
- The editor supports a common store contract where `GET` returns the
  fragments and a successful `POST` returns only `{ success, count }`.
- The server-side live store also retains submitted canonical rows when an
  existing save callback returns that acknowledgement-only shape.
- A provider-neutral example connects server-side model functions to an existing
  private HTTP store without creating another service, namespace or credential.
- Installation instructions require the coding AI to inspect and reuse the
  portal's existing authenticated storage.
- If no suitable private storage route exists, the installer must stop and ask
  the owner before adding infrastructure.

### Removed

- the dedicated MemFrags storage service;
- the dedicated namespace configuration;
- the separate MemFrags hosting-provider proxy;
- MemFrags-specific storage credentials and session adapter;
- instructions that made a separate provider-specific system mandatory.

No provider matching behaviour or owner-facing editing capability was removed.
