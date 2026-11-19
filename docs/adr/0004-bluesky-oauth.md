# 0004. Authenticate with Bluesky OAuth

- Status: Accepted
- Date: 2026-11-18

## Context

Every user must log in with Bluesky (the page is blurred until they do). The app must write records to the user's repository ([0005](0005-results-as-atproto-records.md)) and know their DID and handle. App passwords would work but ask users to hand a credential to a third-party app.

## Decision

Use AT Protocol OAuth via the official `@atproto/oauth-client-*` libraries. Whether the OAuth client runs in the browser (`oauth-client-browser`, public client) or on the server (`oauth-client-node`, confidential client) is decided by a time-boxed spike, and recorded by amending this ADR's open question into a new ADR.

## Consequences

- Requires a publicly hosted `client-metadata.json` at an HTTPS URL; local development uses the loopback client mode.
- Requires deployment/domain to exist before end-to-end OAuth can be tested outside localhost.
- The server must never trust a DID supplied by the client without verification. With browser-side OAuth, the server verifies authorship by reading the record from the user's repo (see [0005](0005-results-as-atproto-records.md)).

## Open questions

- Browser-side vs server-side OAuth client (spike).
