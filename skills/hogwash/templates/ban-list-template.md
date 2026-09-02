# Ban list

Host agent: replace this guidance with literal words and phrases the user
bans. The `idiolect` skill collects bans properly: only the user declares
them, and an observed absence is never a ban. Hogwash reads bullet items as rules, so keep guidance and category notes outside bullets until the user supplies real entries. A list with no bullets scans with a note on stderr and no active bans.

Put the banned term first. Put the reason after a spaced hyphen (` - `). An em dash or en dash also works as the separator, but many owners ban those, so the hyphen is the safe default. Add each banned inflection as a separate bullet.

Example after the user approves it (shown as code so it is not read as a rule):

`- utilize - use "use"`
