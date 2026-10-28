# Ellivien MemFrags

[Ellivien MemFrags](https://github.com/ellivien/ellivien-memfrags) is the
live-editable, trigger-based memory component used with Ellivien companion
portals.

It examines the newest user message, selects only matching owner-written
memory fragments and inserts one compact context block at the server-side model
boundary. The full private library is not sent with every message.

## Best fit: an existing Ellivien portal

The primary supported installation is the architecture already supplied to
Ellivien portal owners and used in working portals:

```text
authenticated Ellivien portal editor
              │
              ▼
existing Cloudflare sync proxy and Worker
              │
              ▼
`memory-fragments` in the existing PORTAL_STORAGE KV namespace
              ▲
              │
Netlify model function loads the same library and injects matched context
```

MemFrags reuses the portal's existing Cloudflare Worker, KV namespace, sync
token and custom authentication. It does **not** require a second Worker,
namespace, database, password gate or set of storage credentials.

Start with
[`integrations/ellivien-portal/README.md`](integrations/ellivien-portal/README.md).

## I am not technical. Can I still use this?

Yes. Give this repository and a recoverable copy of your portal to a capable
coding AI, then use this prompt:

> Please add Ellivien MemFrags to my existing Ellivien companion portal using
> https://github.com/ellivien/ellivien-memfrags
>
> Read `INSTALL-WITH-AI.md` and
> `integrations/ellivien-portal/README.md` first. Preserve my existing model,
> prompt, authentication, hosting, interface and conversations. Reuse my
> existing Ellivien Cloudflare Worker, `PORTAL_STORAGE` KV binding, sync token
> and authenticated proxy. Do not create another Worker, KV namespace,
> database, password gate, account or MemFrags-specific secret. Make a
> recoverable backup, work locally first, run the repository and portal tests
> and do not deploy or publish without my explicit approval.

Never add real private fragments or credentials to a repository or attached
ZIP.

## What the owner gets

- A live **Memory fragments** editor inside the portal.
- Search, categories, aliases, adding, editing and deleting.
- **Save live** without redeploying for ordinary memory changes.
- Whole-word trigger matching against only the newest user message.
- One copy of a definition even when several aliases match.
- Safe cached fallback when the fragment store is temporarily unavailable.

## Other portals and storage providers

The matching engine and editor are portable, but this repository's complete,
field-tested installation path targets Ellivien portals with the existing
Cloudflare KV Sync and custom-authentication foundation.

A different portal may adapt MemFrags to its own authenticated private store
using `FULL-SYSTEM-INSTALL.md` and
`examples/server/use-existing-http-store.cjs`. That is an engineering task, not
a promise that an untested portal or storage provider will work unchanged.

## Development

The matching core has no runtime dependencies and supports Node 18 or newer.

```bash
npm test
```

The package also includes OpenAI-compatible and Anthropic context-placement
examples. Those examples do not change an adopter's model or provider.

## Privacy and safety

- Keep fragments and credentials out of public browser assets and source.
- Preserve the portal's existing owner authentication.
- Perform matching and injection on a trusted server.
- Never store passwords, API keys or financial credentials as fragments.
- Treat fragment text as contextual data, not executable instructions.
- Do not copy an owner's Worker URL, account ID, namespace ID, email address,
  prompt, companion names or private memories into a public repository.

## Project status

Version 0.2.1 packages the current Ellivien live-modal architecture while
retaining the tested provider-neutral matching core. The primary integration
adds one route and one storage key to the adopter's existing Ellivien
Cloudflare KV Sync foundation; it provisions no separate backend.

## Releases and transparent usage evidence

Use the named asset on the GitHub **Releases** page. GitHub exposes download
counts for named release assets but not for automatically generated source
archives.

The optional repository-maintainer workflow preserves GitHub's aggregate
traffic evidence. MemFrags itself adds no analytics, cookies or telemetry to
companion portals.

## Authorship and licence

MemFrags was created by [Ellivien](https://github.com/ellivien). The canonical
project is
[github.com/ellivien/ellivien-memfrags](https://github.com/ellivien/ellivien-memfrags).

Licensed under the Apache License 2.0. Redistributions and derivative works
must preserve the applicable copyright, licence and attribution notices. The
licence does not grant permission to use the Ellivien name or branding except
to describe the origin of the software.
