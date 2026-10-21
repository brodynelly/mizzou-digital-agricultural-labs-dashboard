# Local database backups

Database backups are runtime data and must not be committed. Existing local JSON snapshots are preserved for recovery and removed from the next repository tree; do not upload them to source control. The included empty example documents the backup envelope only and contains no application records.

Store real backups in access-controlled storage outside the repository, set a retention period, and verify restore procedures against an isolated database before relying on them. No live database was accessed or restored for this change.
