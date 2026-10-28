# Changelog

## 0.2.1

Packaged the field-tested Ellivien live-modal architecture used in the GPT-4o
Memory Fragments guide, while retaining an advanced adaptation path for other
portal architectures.

### Changed

- The primary installation now reuses an Ellivien portal's existing Cloudflare
  Worker, `PORTAL_STORAGE` KV binding, sync token and authenticated proxy.
- The included Worker route stores the live library under the
  `memory-fragments` key without creating another backend.
- The included Ellivien server adapter loads the same private library for
  server-side model injection with a 60-second cache and safe fallback.
- The editor accepts the existing authenticated Cloudflare proxy route
  explicitly and does not expose the Worker bearer token.
- The editor supports a common store contract where `GET` returns the
  fragments and a successful `POST` returns only `{ success, count }`.
- The server-side live store also retains submitted canonical rows when an
  existing save callback returns that acknowledgement-only shape.
- A provider-neutral example connects server-side model functions to an existing
  private HTTP store without creating another service, namespace or credential.
- Installation instructions identify Ellivien portals as the best-supported
  target and require the coding AI to preserve their existing infrastructure.
- Other portal and storage architectures are clearly described as advanced
  adaptations requiring their own engineering and end-to-end tests.

### Prohibited

- a dedicated MemFrags Worker or storage service;
- a second KV namespace or database;
- MemFrags-specific storage credentials;
- production identifiers, private names, fragments or credentials in public
  examples and release artefacts.

The matching core remains portable for experienced adopters, but the complete
documented default is the proven Ellivien portal route.
