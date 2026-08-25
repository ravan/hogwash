# Vendored `codex app-server` protocol schemas

Pinned copy of the generated JSON Schema for the app-server messages hogwash
sends and reads (spec §3.2.3). `VERSION` holds the `codex --version` these were
generated from; `src/adapters/codex-protocol.ts` carries the same string as
`CODEX_PROTOCOL_VERSION`, and `codex-protocol.test.ts` fails when the two drift
apart or when a field hogwash depends on leaves a schema.

Only the messages hogwash uses are vendored. The full generated protocol is
663 files / 3.7 MB; a whole-protocol copy would bury the fields we actually
depend on in every version-bump diff.

## Regenerating

```sh
codex --version                                   # the new pin
codex app-server generate-json-schema --out /tmp/codexschema
cp /tmp/codexschema/JSONRPCMessage.json /tmp/codexschema/ServerRequest.json .
cp /tmp/codexschema/v1/Initialize*.json v1/
cp /tmp/codexschema/v2/ThreadStartParams.json /tmp/codexschema/v2/ThreadStartResponse.json \
   /tmp/codexschema/v2/TurnStartParams.json /tmp/codexschema/v2/TurnCompletedNotification.json \
   /tmp/codexschema/v2/ErrorNotification.json v2/
```

Then update `VERSION` and `CODEX_PROTOCOL_VERSION`, run the suite, and land the
result as a reviewed git diff.
