# Release notes

The team decided to look into the retry logs because the queue
stalled twice in March. The report is a record of what we changed, and
the same failure may return in the next release.

The scheduler now retries if the broker drops a connection.
Older notes claimed "the backlog clears within an hour", which was optimistic.

The migration can run twice without harm. One maintainer says that
the change was overdue.
