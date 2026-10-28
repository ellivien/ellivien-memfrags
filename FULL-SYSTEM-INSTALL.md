# Advanced: adapt Ellivien MemFrags to another portal

The complete, field-tested installation supplied by Ellivien targets existing
Ellivien portals and is documented in
`integrations/ellivien-portal/README.md`. Use this guide only when adapting the
matching engine and editor to a different portal architecture or storage
provider.

This is engineering work. Do not imply that an untested portal or backend is
supported unchanged, and do not replace the Ellivien integration with this
generic route when the portal already has the Ellivien Cloudflare KV Sync
foundation.

Use this provider-neutral integration pattern:

```text
owner opens the MemFrags editor
        │
        ▼
portal's existing authenticated storage route
        │
        ▼
portal's existing private server-side store
        ▲
        │
model proxy loads the same library, matches the latest user message
and injects only the relevant definitions
```

MemFrags does not require a dedicated storage service, namespace, serverless
function or second set of credentials. Reuse the portal's existing authenticated
storage path where it has one. If it does not, stop and obtain the owner's
explicit architectural choice before adding infrastructure.

## What the package supplies

- `src/browser/memfrags-editor.js` provides the owner-facing editor.
- `src/server/live-memory-store.cjs` connects the model proxy to an existing
  private storage loader and provides the same 60-second cache and safe fallback
  pattern used by the Ellivien portals.
- `src/memory-fragment-utils.cjs` validates fragments, matches whole-word
  triggers and constructs the read-only context block.
- the provider examples show where to place that context in OpenAI-compatible
  and Anthropic-style requests.

The package deliberately does not create or prescribe storage infrastructure.

## One-time integration

1. Inspect the portal before editing it. Identify its existing authentication,
   private server-side storage route and model proxy.
2. Preserve that architecture. Do not create a new Worker, namespace, database,
   relay, account or secret unless the owner separately chooses one after the
   alternatives have been explained.
3. Add `src/browser/memfrags-editor.js` to the authenticated portal and connect
   its button to the portal's existing memory-fragment endpoint.
4. Pass the portal's own authenticated endpoint explicitly:

   ```js
   EllivienMemFragsEditor.show({
     apiUrl: '/your-existing-authenticated-route/memory-fragments',
     getHeaders: () => buildPortalAuthHeaders()
   });
   ```

   Replace the example path and header function after inspecting the adopter's
   existing authentication and storage boundary. Do not copy a route or secret
   from another application.
   The endpoint must return `{ fragments: [...] }` for `GET`, accept
   `{ fragments: [...] }` for `POST` and may acknowledge a successful save as
   `{ success: true, count: ... }` without repeating the saved rows. The supplied
   editor supports both that response and a backend that returns the fragments.
5. If the portal uses a different existing backend, point `apiUrl` at its
   authenticated GET/POST route. The route must return `{ fragments: [...] }`
   and accept `{ fragments: [...] }` when saving.
6. Connect the model proxy to the same private library. The supplied live-store
   adapter accepts the portal's existing loader rather than assuming a hosting
   provider:

   ```js
   const { createLiveMemoryStore } = require('ellivien-memfrags/server/live-store');

   const memoryStore = createLiveMemoryStore({
     loadFragments: loadFragmentsFromExistingPortalStorage,
     saveFragments: saveFragmentsToExistingPortalStorage,
     cacheTtlMs: 60_000
   });
   ```

   `saveFragments` may return the saved rows, `{ fragments: [...] }`, or a
   successful acknowledgement such as `{ success: true, count: ... }`. For an
   acknowledgement-only response, the live store retains the canonical rows it
   submitted.

   For an existing private HTTP store, adapt
   `examples/server/use-existing-http-store.cjs`. Pass the existing endpoint and
   a server-side `getHeaders` function from the adopter's application. Keep all
   credential values in the application's established secret-management system;
   never expose them to browser code or commit them to this package.

7. On each model request, call `memoryStore.load()`, then pass the messages and
   fragments to `buildMemoryFragmentContext()`.
8. Inject only `result.systemBlock` when `result.used` is true. Never send the
   complete library merely because it exists.

If the portal has no suitable private storage route, stop and explain that to
the owner. Storage is an architectural choice for the portal, not something
this feature may silently add.

## Required verification

Before hand-off, verify all of the following:

- an unauthenticated visitor cannot load or save fragments;
- the editor uses the portal's existing authenticated storage route;
- no dedicated MemFrags Worker, namespace, relay or credential was created;
- adding a fragment and pressing **Save live** persists it without a deploy;
- reopening the editor shows the saved fragment;
- mentioning its trigger injects its definition once;
- a message without a trigger injects nothing;
- fragment text and storage credentials do not appear in public source or logs;
- ordinary chat still works if the storage route is temporarily unavailable.

The model-side adapter caches successful reads for 60 seconds by default. Choose
an explicit `cacheTtlMs` or an application-level invalidation route when the host
requires faster cross-process visibility after an editor save. Test the actual
freshness behaviour rather than promising immediate propagation.

Do not deploy, publish or migrate an owner's real fragment library without the
owner's explicit approval.
