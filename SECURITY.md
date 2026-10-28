# Security policy

Do not report credentials, private memories or conversation content in a public
issue.

The primary Ellivien installation must reuse the portal's existing authenticated
Cloudflare KV Sync route, Worker, `PORTAL_STORAGE` binding and sync token. The
installer must preserve that portal's real owner-session checks and must not
place private fragments or storage credentials in browser assets or source
control.

The package deliberately does not provision a Worker, namespace, database,
relay or secret. Its Ellivien route adds only the `memory-fragments` key and
authenticated route to the owner's already-working sync foundation. If another
portal has no suitable private storage route, the installer must stop and ask
the owner before adding infrastructure.

Public source, examples, tests and releases must contain no production Worker
URL, account or namespace identifier, credential, email address, local path,
owner or companion name, private prompt, conversation text or real fragment.

Fragments are visible to the authenticated owner and matched definitions are
sent to the model provider as context. Do not use fragments for passwords, API
keys, financial credentials or other secrets.

For a vulnerability report, use GitHub's private reporting route when
available. Otherwise publish only a synthetic reproduction with no private
data and request a private contact route.
