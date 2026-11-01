# Preserved GitHub metrics

After setup, the scheduled workflow writes timestamped aggregate GitHub
traffic snapshots into `snapshots/` every Sunday at 08:17 UTC.

These files intentionally contain no visitor identities, cookies, IP addresses
or MemFrags installation telemetry. See [`GITHUB-METRICS.md`](../GITHUB-METRICS.md)
for setup and interpretation.
