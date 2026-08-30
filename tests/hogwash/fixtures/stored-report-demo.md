# Migration notes for the ingest service

We moved the ingest service to the new queue last Thursday. The cutover took
41 minutes, and one batch of 2,300 records was replayed by hand.

The rollout plan covered tooling, people, and expectations.

## Challenges and Future Directions

Queue depth peaked at 18,000 messages. We delved into the consumer logs and
found one consumer group stuck on a poison message.

This development offers valuable insights into the evolving landscape of the
field.

The data tells us what the operators want.

## What we changed

We raised the visibility timeout from 30 seconds to 120 seconds and added a
dead-letter queue with a 5-message threshold. The replay tool now writes a
manifest, so a second run skips the records it already wrote.

And that should bother you more than the outage itself.

## Open items

- The dashboard still reads from the old table.
- Alerting on dead-letter depth is not wired up.
- The runbook names the old queue.
