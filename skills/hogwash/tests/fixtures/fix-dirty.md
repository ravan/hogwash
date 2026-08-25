# Release notes

The team decided to delve into the retry logs due to the fact that the queue
stalled twice in March. The report stands as a record of what we changed, and
the same failure may potentially return in the next release.

The scheduler now retries in the event that the broker drops a connection.
Older notes claimed “the backlog clears within an hour”, which was optimistic.

The migration has the ability to run twice without harm. Experts agree that
the change was overdue.
