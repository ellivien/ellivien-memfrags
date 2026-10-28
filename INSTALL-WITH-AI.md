# Install Ellivien MemFrags with your coding AI

This guide is for the coding AI performing the work. The portal owner should
not have to assemble infrastructure or merge code manually.

Canonical project:
https://github.com/ellivien/ellivien-memfrags

## Default supported target

Assume the owner has an existing Ellivien threaded portal with working
Cloudflare KV Sync and custom authentication unless inspection proves
otherwise. Follow `integrations/ellivien-portal/README.md`.

The supported default reuses the existing Ellivien Cloudflare Worker; it does
not provision a MemFrags Worker.

Reuse the portal's existing:

- Cloudflare Worker;
- `PORTAL_STORAGE` KV binding and namespace;
- `CLOUDFLARE_SYNC_WORKER_URL` and `CLOUDFLARE_SYNC_TOKEN`;
- authenticated browser-to-Worker proxy; and
- Netlify model function.

Add the `memory-fragments` key and authenticated route to that existing
foundation. Do not create another Worker, namespace, database, proxy, account,
password gate or MemFrags-specific credential.

## Before changing anything

1. Read the repository instructions, integration files, source and tests.
2. Inspect the real portal and confirm its authentication, storage, model and
   deployment boundaries.
3. Confirm existing thread sync works across authenticated devices.
4. Explain the intended files and behaviour to the owner.
5. Create a recoverable backup, branch or copy.
6. Preserve the model, provider, prompt, hosting, authentication, production
   data, interface and unrelated behaviour.
7. Do not deploy without the owner's explicit approval.

Never copy production fragments, credentials, account IDs, namespace IDs,
Worker URLs, email addresses, private names, local paths or prompts into this
repository, a public issue, test fixture or release archive. Use synthetic
values in every test.

## Required implementation

1. Merge the supplied Worker route into the existing authenticated `/api/*`
   handler. Do not replace the complete Worker.
2. Add `src/browser/memfrags-editor.js` and connect it using
   `integrations/ellivien-portal/browser-editor-hook.txt`.
3. Load the same library in the real model proxy through
   `examples/server/use-ellivien-cloudflare-kv-store.cjs`.
4. Pass only the newest user message and loaded library to
   `buildMemoryFragmentContext()`.
5. If `result.used` is false, send the ordinary model request unchanged.
6. If `result.used` is true, insert only `result.systemBlock` after the stable
   base prompt and before ordinary conversation turns.
7. Preserve the portal's existing model identifier and response shape.

## Non-Ellivien portals

If the portal does not have the Ellivien Cloudflare KV Sync foundation, stop
and explain that the primary integration does not apply unchanged.

An experienced implementer may adapt the matching core and editor to another
authenticated private store using `FULL-SYSTEM-INSTALL.md` and
`examples/server/use-existing-http-store.cjs`. Obtain the owner's approval for
that engineering work and test the complete portal. Do not silently invent new
infrastructure.

## Minimum verification

Run `npm test`, then complete every acceptance check in
`integrations/ellivien-portal/README.md` on an owner-approved preview. Show the
owner the results and exact changed files.

Do not describe an installation as complete merely because the matcher unit
tests pass. Storage, authentication, live editing, model injection, ordinary
chat and existing thread sync must all be verified together.

## Attribution

If source is copied rather than installed as a dependency, preserve its
copyright, SPDX and original-project header together with `LICENSE` and
`NOTICE`.
