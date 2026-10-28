# Install MemFrags in an Ellivien portal

This is the primary, field-tested MemFrags integration. It is based on the
Ellivien GPT-4o Memory Fragments guide supplied to portal owners.

It requires an Ellivien threaded portal that already has:

- a deployed Cloudflare Worker and KV namespace for portal sync;
- the Ellivien authenticated `/api/*` storage pattern;
- matching `CLOUDFLARE_SYNC_WORKER_URL` and `CLOUDFLARE_SYNC_TOKEN` values in
  Netlify; and
- working cross-device thread sync and password access.

MemFrags reuses all of that existing infrastructure. It adds one authenticated
route to the existing Worker and stores the library under the
`memory-fragments` key in the existing `env.PORTAL_STORAGE` binding.

Do not create a second Worker, KV namespace, database, password gate, sync
token, Netlify site or MemFrags-specific storage service.

## Included integration files

- `cloudflare-worker-memory-fragments-route.txt` is merged into the existing
  Worker's authenticated request handler.
- `browser-editor-hook.txt` connects the supplied editor to the existing
  authenticated Cloudflare sync proxy.
- `examples/server/use-ellivien-cloudflare-kv-store.cjs` gives the portal's
  server-side model function a cached loader for the same library.
- `src/memory-fragment-utils.cjs` matches only the newest user message and
  constructs the server-side context block.
- `src/browser/memfrags-editor.js` supplies the live owner editor.

## Installation order

1. Make recoverable backups of the working portal and deployed Worker.
2. Inspect the real portal. Preserve its model, prompt, authentication,
   threads, styling, storage and unrelated features.
3. Merge `cloudflare-worker-memory-fragments-route.txt` into the existing
   Worker's authenticated `/api/*` handler and deploy that Worker.
4. Verify the existing thread-sync route still works.
5. Add the supplied browser editor and merge the call from
   `browser-editor-hook.txt` into the portal.
6. Load the fragment library in the real model proxy using
   `createEllivienCloudflareKvMemoryStore()` and inject only
   `result.systemBlock` when `buildMemoryFragmentContext()` reports a match.
7. Deploy a non-production portal preview and complete the acceptance checks
   below before production.

Do not replace a customised Worker, `index.html` or model proxy wholesale.
These files are integration material to merge into the owner's real portal.

## Required acceptance checks

1. Existing threads still load and sync before any fragment is created.
2. An unauthenticated request cannot read or write `/api/memory-fragments`.
3. The editor opens and an empty library loads without `Not found`.
4. A synthetic fragment survives closing, reopening and refreshing the portal.
5. The same fragment appears on another authenticated device.
6. Its exact trigger injects its definition once into a model request.
7. A partial word does not trigger it and aliases do not duplicate it.
8. Deleting the synthetic fragment persists.
9. Ordinary chat continues if fragment storage is temporarily unavailable.
10. Thread sync and password access still work.

Never put a real memory library, password, token, account identifier or Worker
URL in this repository or in public browser assets.

## Other portal architectures

MemFrags' matcher and editor can be adapted to another authenticated private
store, but that is not the default installation described here. A non-Ellivien
portal requires engineering and its own end-to-end testing. Start with
`FULL-SYSTEM-INSTALL.md` and `examples/server/use-existing-http-store.cjs`.
