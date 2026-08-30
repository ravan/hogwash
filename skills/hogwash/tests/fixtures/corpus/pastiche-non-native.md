# Report on the migration of the billing database

This document describes the migration of the billing database from PostgreSQL 13 to PostgreSQL 16, which was performed by our team between 4 and 11 March. The purpose of this document is to record what was done and which problems occurred, so that the next migration can be prepared better.

## Preparation

Before the migration we made a full backup and we verified the restore procedure on a separate machine. The restore took 2 hours and 40 minutes. We informed the finance department three weeks in advance, because the invoices of the month must be generated on the first working day.

The migration was executed with logical replication. We have chosen this method because the downtime is shorter in comparison with a dump and restore. The replication slot was created on 4 March at 09:00 and the initial synchronisation finished after 31 hours.

## Problems which occurred

Two problems occurred during the migration. First, the extension `pg_stat_statements` was not present in the new cluster, therefore the monitoring dashboard was empty for one day. Second, one materialised view was not refreshed automatically, because the refresh job used a hard-coded connection string with the old host name.

Both problems were corrected on 12 March. The connection string is now read from the environment, and the list of extensions is part of the provisioning script.

## Recommendations for the next migration

We recommend that the list of extensions and the list of scheduled jobs are compared automatically before the switch-over. Furthermore, we propose to perform the switch-over on a Saturday morning and not on a Friday evening, because fewer colleagues are available on Friday evening in case of an error.

With regard to the monitoring, it is worth noting that the dashboards must be re-created for the purpose of the new cluster identifier. In terms of effort this is approximately one day of work. The provisioning script is now sufficiently robust for this task, but it was not tested with a comprehensive set of extensions.

If there are questions concerning this report, please contact the database team.
