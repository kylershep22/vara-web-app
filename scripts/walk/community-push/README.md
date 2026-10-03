# Community push walk helper (NPM-3a-ii)

Writes ONE Community test event, in the exact shape the mobile app writes, so the
deployed sender pushes to the phone during the NPM-3a-ii walk. Kyle's ruling
II-D11 (docs/decisions/community-v1-rulings.md, Round 8) governs it.

- **Dry run by default.** A dry run only reads. It prints the project, the sender
  and the recipient (UID and display name), and the exact document it would write.
  Only `--execute` writes.
- **Allowlist.** `allowlist.local.json` beside the script, ignored by git. Copy
  `allowlist.example.json` and fill in the project ID and the test UIDs. Without it
  the script refuses to run; a UID outside it, or a credential for another
  project, is refused.
- **Two events only.** `message`: a directMessages document from `--from` to
  `--to` in their existing conversation (refused if they have none). `request`: a
  pending connections document (refused if any connection document already exists
  between them). Unlike the app, a message does not update the conversation's last
  message or unread count.
- **No credentials in the repo.** Application Default Credentials: set
  `GOOGLE_APPLICATION_CREDENTIALS` to a service-account key stored outside this
  repo, or pass `--key <path>`. Behind Norton TLS inspection, set
  `NODE_EXTRA_CA_CERTS` to the root CA first.
- It never reads `userPrivate` and never prints a token.

## Windows cmd, from the repo root

```
copy scripts\walk\community-push\allowlist.example.json scripts\walk\community-push\allowlist.local.json
notepad scripts\walk\community-push\allowlist.local.json
set GOOGLE_APPLICATION_CREDENTIALS=C:\path\outside\the\repo\serviceAccountKey.json
node scripts\walk\community-push\communityPushHelper.js message --from B --to A
node scripts\walk\community-push\communityPushHelper.js message --from B --to A --execute
node scripts\walk\community-push\communityPushHelper.js request --from C --to A --execute
```

`--from` and `--to` take a label from the allowlist (A, B, C) or a UID in it. After
`--execute` it prints `WROTE <collection>/<id>`; the ID is the event ID for the Logs
Explorer queries and the marker `notificationLog/{recipient}/community/{id}`.

Its guards are tested in `functions-notifications/src/__tests__/walkHelper.test.js`.
