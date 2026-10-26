# Install Ellivien MemFrags with your coding AI

This guide is for the coding AI performing the work. The portal owner does not
need to execute these steps manually.

Canonical project:
https://github.com/ellivien/ellivien-memfrags

## Goal

Add trigger-based, owner-controlled memory fragments without changing the
companion's model, identity prompt, conversation history, hosting or interface
unless the owner explicitly requests those changes.

## Before changing the portal

1. Read the repository instructions, source, examples and tests.
2. Inspect the existing portal and identify:
   - its authenticated private storage route;
   - where the latest user message is available;
   - where stable system context is assembled;
   - which provider request format is used;
   - how the portal is tested and deployed.
3. Explain the intended files and behaviour to the owner.
4. Create a recoverable backup, branch or copy.
5. Do not change model, provider, prompt, hosting, authentication, production
   data or deployment settings without separate approval.

## Integration requirements

1. Follow `FULL-SYSTEM-INSTALL.md` and reuse the portal's existing authenticated
   server-side storage. Do not create a dedicated MemFrags Worker, namespace,
   proxy, account or secret.
2. Add the supplied editor and connect it to the existing owner session and
   memory-fragment endpoint.
3. Keep real fragments and storage credentials out of browser JavaScript, HTML
   and public repositories.
4. Use the latest non-empty user message and the owner's fragment library with
   `buildMemoryFragmentContext(messages, fragments)`.
5. If `result.used` is false, send the normal model request unchanged.
6. If `result.used` is true, add `result.systemBlock` as read-only context after
   the stable base prompt and before ordinary conversation turns.
7. Send only matched fragments. Do not send the entire library on every turn.
8. Verify that editing fragments through the portal works without a redeploy.
   Account for the configured model-side cache TTL when testing how quickly a
   separate model process sees a saved change.

If no suitable private storage route exists, stop and ask the owner which
storage approach they want. Do not invent infrastructure on their behalf.

## Provider routes

Use `examples/openai-compatible.cjs` for role-based messages and
`examples/anthropic.cjs` for a separate system field. For another provider,
adapt only the request boundary and keep the matching engine unchanged.

When the existing portal exposes a private HTTP store, adapt
`examples/server/use-existing-http-store.cjs`. The browser editor must use the
portal's authenticated owner route. Server-side functions may use the portal's
existing server-held URL and authentication mechanism, but must never expose
credentials to browser code or create an unnecessary MemFrags-specific proxy.

## Minimum tests before hand-off

Run:

```bash
npm test
```

Also verify that:

- a matching latest message injects the intended definition once;
- aliases do not duplicate a definition;
- partial words do not cause false matches;
- a message with no trigger sends no fragment context;
- private fragments never appear in public assets or logs;
- the editor reuses the existing authenticated storage route;
- no separate MemFrags infrastructure has been provisioned;
- the base prompt, provider route and ordinary chat still work;
- a temporary storage failure degrades safely instead of breaking chat.

Show the owner the results and changed files. Do not deploy or publish without
explicit approval.

## Attribution

If source is copied rather than installed as a dependency, preserve its
copyright, SPDX and original-project header together with `LICENSE` and
`NOTICE`.
