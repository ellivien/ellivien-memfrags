# Security policy

Do not report credentials, private memories or conversation content in a public
issue.

MemFrags must reuse the portal's existing authenticated private storage route.
The installer must preserve that portal's real owner-session checks and must not
place private fragments or storage credentials in browser assets or source
control.

The package deliberately does not provision a Worker, namespace, database,
relay or secret. If the existing portal has no suitable private storage route,
the installer must stop and ask the owner before adding infrastructure.

Fragments are visible to the authenticated owner and matched definitions are
sent to the model provider as context. Do not use fragments for passwords, API
keys, financial credentials or other secrets.

For a vulnerability report, use GitHub's private reporting route when
available. Otherwise publish only a synthetic reproduction with no private
data and request a private contact route.
