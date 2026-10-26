# Ellivien MemFrags

[Ellivien MemFrags](https://github.com/ellivien/ellivien-memfrags) is an
open-source memory component created by Ellivien for companion portals.

It adds relevant, owner-controlled memory fragments to an AI conversation only
when they are needed. The editor and model integration reuse the portal's
existing authenticated private storage route. MemFrags does not require a
dedicated Worker, namespace, database or second set of storage credentials.

Instead of placing an entire memory library in every request, MemFrags examines
the latest user message, finds whole-word trigger matches, deduplicates aliases
and returns one compact context block for the application to inject server-side.

## I am not technical. Can I still use this?

Yes. Give this repository to a capable coding AI that can inspect and edit your
portal, then use this prompt:

> Please add Ellivien MemFrags to my existing companion portal using
> https://github.com/ellivien/ellivien-memfrags
>
> Read `INSTALL-WITH-AI.md` and `FULL-SYSTEM-INSTALL.md` first. Preserve my
> existing model, prompt, authentication, hosting and interface. Reuse the
> portal's existing authenticated private storage route. Do not create a
> separate MemFrags Worker, namespace, database, proxy, account or secret. If
> the portal has no suitable private storage route, stop and explain the options
> before changing anything. Make a recoverable backup, work locally first, run
> the repository and portal tests and do not deploy or publish without my
> explicit approval.

If the coding AI cannot open GitHub links, download the repository ZIP and
attach it with the same prompt. Never add a real private memory library to the
ZIP.

## What the owner gets

After the one-time integration, the portal owner can:

- open a **Memory fragments** editor inside the portal;
- search, add, edit and delete fragments;
- press **Save live** to update the portal's existing private store;
- continue chatting without redeploying for ordinary fragment changes.

The model route reads that same private library, caches it briefly and sends
only fragments triggered by the newest user message.

## Storage pattern

The browser editor must call an authenticated storage route supplied by the
adopter's portal. The model-side code must read the same private library. The
repository deliberately contains no account identifiers, production hostnames
or assumed hosting-provider route: inspect the portal and pass its existing
authenticated endpoint explicitly as `apiUrl`.

## Quick start for developers

The matching core has no runtime dependencies and uses CommonJS:

```js
const { buildMemoryFragmentContext } = require('ellivien-memfrags');

const messages = [
  { role: 'user', content: 'Shall we go back to the Harbour Room?' }
];

const fragments = [
  {
    category: 'places',
    triggers: ['Harbour Room', 'the Harbour Room'],
    definition: 'The Harbour Room is a quiet fictional reading room.'
  }
];

const result = buildMemoryFragmentContext(messages, fragments);
```

Use `src/server/live-memory-store.cjs` to connect the model proxy to the
portal's existing private loader while retaining a short cache and safe fallback.
See `examples/server/use-existing-http-store.cjs` for a provider-neutral HTTP
adapter and the provider examples for context placement. Supply the portal's
existing URL and server-generated authentication headers; never hard-code them
in browser assets or commit them to a repository.

## Privacy and safety

- Perform matching and context injection on a trusted server.
- Keep private fragments and storage credentials out of public browser assets.
- Reuse the portal's real owner authentication.
- Do not store passwords, API keys or financial credentials in fragments.
- Tell owners what is stored and let them edit or delete it.
- Treat fragment text as contextual data, not executable instructions.

## Development

Run:

```bash
npm test
```

Node 18 or newer is supported. No dependency installation is required.

## Project status

Version 0.2.1 corrects the installation architecture so the editor and matcher
reuse a portal's existing authenticated private storage route. It removes the
unnecessary dedicated MemFrags Worker, namespace and proxy design while
preserving live editing, provider-neutral matching and safe cached loading.

## Releases and transparent usage evidence

Use the versioned package on the GitHub **Releases** page when downloading
MemFrags. GitHub counts downloads of named release assets, while downloads of
the automatically generated source archives are not exposed as release-asset
download counts.

This repository is prepared to preserve GitHub's aggregate traffic evidence
twice each week because GitHub exposes repository views, visitors, clones,
referrers and popular pages for only the most recent 14 days. Snapshots contain
aggregate counts only. MemFrags does not add analytics, cookies or telemetry to
companion portals.

Repository maintainers should complete the one-time setup in
[`GITHUB-METRICS.md`](GITHUB-METRICS.md) before the first measured release.

## Authorship and licence

MemFrags was created by [Ellivien](https://github.com/ellivien). The canonical
project is
[github.com/ellivien/ellivien-memfrags](https://github.com/ellivien/ellivien-memfrags).

Licensed under the Apache License 2.0. Redistributions and derivative works
must preserve the applicable copyright, licence and attribution notices. The
licence does not grant permission to use the Ellivien name or branding except
to describe the origin of the software.
