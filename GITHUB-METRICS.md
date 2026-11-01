# GitHub release and metrics evidence

MemFrags uses GitHub's native aggregate evidence rather than adding analytics,
cookies or telemetry to companion portals.

## What will be preserved

The scheduled workflow records:

- repository views and unique visitors;
- full clones and unique cloners;
- the top referring sites and popular repository pages;
- stars and forks;
- every versioned release asset and its cumulative download count.

Each snapshot keeps both the per-asset counts and a
`releasePackageDownloadTotal` that sums only named `.zip` packages. The separate
`releaseAssetDownloadTotal` includes checksum-file downloads and must not be
described as package downloads.

GitHub exposes repository traffic for only the latest 14 days. The workflow
runs automatically every Sunday at 08:17 UTC so its overlapping snapshots preserve that
otherwise temporary history. The JSON files contain aggregate counts only and
do not identify visitors.

## One-time setup before a measured release

1. Create a fine-grained personal access token in GitHub.
2. Restrict its repository access to `ellivien-memfrags` only.
3. Grant **Administration: Read-only** and **Contents: Read-only**, with no
   write permissions. Administration read is required for GitHub's traffic
   endpoints; Contents read allows the same collector to record releases and
   their asset download counts while the repository is private.
4. In the MemFrags repository, open **Settings → Secrets and variables →
   Actions**.
5. Add the token as a repository secret named `MEMFRAGS_TRAFFIC_TOKEN`.
6. Open **Actions → Preserve GitHub metrics → Run workflow** once after the
   updated repository is available.
7. Confirm that a new JSON file appears under `metrics/snapshots/`.

The workflow's ordinary `GITHUB_TOKEN` receives only `contents: write`. It is
used to commit the aggregate snapshot. The separate read-only token is used
only because GitHub's traffic API requires repository Administration read
access.

## Creating a measurable release

Do not create a release merely because these workflows exist. First complete
the clean-room and owner acceptance requirements in `RELEASE-ACCEPTANCE.md`.

When the accepted source version and `package.json` agree, commit the release
source and create a matching tag such as `v0.2.1`. Pushing that tag starts the
release workflow. It creates:

- `ellivien-memfrags-v0.2.1.zip`;
- `ellivien-memfrags-v0.2.1.zip.sha256`.

Direct people to the named ZIP on the GitHub Releases page. GitHub exposes a
cumulative `download_count` for named release assets. GitHub's automatically
generated “Source code” ZIP and TAR links do not provide the same asset count.

## Honest interpretation

- Views, visitors, clones, referrers and popular paths are rolling 14-day
  GitHub aggregates captured at a point in time.
- Release downloads count downloads of the named asset, not installations or
  active users.
- Stars and forks indicate public interest, not successful adoption.
- The release workflow performs one checkout when a version is published. The
  recurring metrics workflow deliberately uses the Contents API instead of
  checking out the repository, so it does not manufacture recurring clone
  traffic.
- Preserve the raw snapshots when preparing any funding or impact application;
  describe exactly what each metric measures.
