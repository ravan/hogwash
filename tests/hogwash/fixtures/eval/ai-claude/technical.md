# Connection pooling in a small service

A connection pool keeps a fixed number of database connections open and hands
them out to callers instead of opening a new socket per query. Opening a
Postgres connection costs a TCP handshake, a TLS negotiation, and an
authentication round trip — somewhere between 20 and 80 milliseconds on a
typical network. A pool amortises that once at startup.

## Sizing the pool

The common mistake is making the pool large. A pool of 100 connections against
a database with 8 cores does not give you 100 concurrent queries; it gives you
100 queries fighting over 8 cores plus the memory each backend process holds.
Postgres allocates roughly 5-10 MB per backend before any query runs.

A starting point that has held up for us: `pool_size = cores * 2 + spindles`.
On modern SSD-backed instances the spindle term is effectively zero, so
`cores * 2` is close enough. For an 8-core database that is 16 connections,
shared across every application instance. If you run six application pods, each
pod gets a pool of two or three, not sixteen.

## What breaks

Pools fail in two directions. Too small and requests queue on checkout, which
shows up as latency that grows with load but flat database CPU. Too large and
the database itself queues, which shows up as high database CPU and lock
contention with no obvious hot query.

Both look like "the database is slow" in an application trace. The
distinguishing signal is checkout wait time. Export it. Most pool libraries
expose it as a histogram, and it is the single most useful number for
diagnosing this class of problem.

## Timeouts

Set a checkout timeout, and set it below your request timeout. A pool that
blocks forever on checkout converts a database problem into a thread-pool
exhaustion problem two layers up, where it is much harder to read.
