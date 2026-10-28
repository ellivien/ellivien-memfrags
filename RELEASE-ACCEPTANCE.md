# Release acceptance test

Ellivien MemFrags is not ready for a public release merely because its unit
tests pass. A release candidate must also pass a clean-room installation test.

## Clean-room rule

Give a fresh coding-AI session only:

1. this repository;
2. a recoverable copy of an existing companion portal;
3. access to the portal's ordinary development and test commands; and
4. owner-approved access to a non-production preview only when live-service
   verification begins.

Do not provide private implementation notes or remembered fixes missing from
the repository.

## Required installation result

For the primary supported clean-room test, the copied portal must already have
working Ellivien Cloudflare KV Sync and custom authentication. The installer
must:

- identify the portal's existing authentication, Worker, `PORTAL_STORAGE`,
  sync-proxy and model boundaries;
- reuse the existing Worker, KV namespace, sync token and authenticated proxy;
- add only the supplied `memory-fragments` route and storage key;
- install the supplied editor, Ellivien store adapter and matcher without
  creating a dedicated MemFrags Worker, namespace, database, relay, account or
  secret;
- keep fragments and credentials out of public source;
- ask the owner before adding infrastructure if no suitable storage route exists;
- leave the model, prompt, hosting and unrelated behaviour unchanged;
- explain the proposed deployment and obtain approval before making it live.

## Owner-facing acceptance test

On an authenticated preview, the owner must be able to:

1. open the **Memory fragments** editor;
2. add a synthetic fragment and press **Save live**;
3. close and reopen the editor and see the saved fragment;
4. edit and save it without a deployment;
5. delete and save it without a deployment;
6. mention its trigger and confirm that the intended fragment is selected once;
7. send a message without a trigger and confirm that none is selected.

Also confirm that an unauthenticated request cannot read or write the library,
the same fragment appears on another authenticated device, ordinary chat
continues during a temporary storage failure, existing thread sync still works
and no new MemFrags-specific infrastructure was created.

## Failure rule

Any missing instruction, insecure workaround, unnecessary new backend,
unverified claim or reliance on knowledge outside the repository is a product
failure. A release also fails if source, history, workflow files or archives
contain a real credential, account or namespace ID, Worker URL, unapproved
email address, local path, private owner or companion name, prompt,
conversation text or fragment. The public Ellivien GitHub noreply address is
allowed only as Git author/committer attribution. Repair the repository, reset
the test portal and repeat every audit.

Do not publish a release until the complete test passes and the owner approves
the release.
