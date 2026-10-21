# PAAL Monitoring System

PAAL is a coursework full-stack application for viewing and managing farm, barn, stall, device, and pig records. The repository contains a Next.js frontend, a Node/Express API, MongoDB, and an nginx reverse proxy. The Docker Compose file describes a local development stack; this repository does not establish production readiness or compliance.

## Local development

Requirements: Docker Compose, Node.js only if running services outside containers, and a locally generated MongoDB replica-set keyfile. No production data or credentials are included in the setup template.

1. Copy `.env.example` to `.env` and replace each placeholder with local-only values.
2. Generate a MongoDB keyfile locally at the path in `MONGO_KEYFILE_PATH`, then restrict its permissions for MongoDB. Never commit the keyfile or `.env`.
3. Start the development stack with `docker compose up --build`.
4. Open the local frontend at `http://localhost:3000`; the nginx API proxy is exposed locally on port 8080.

The MongoDB password and JWT signing secret must be supplied through local environment configuration. Backup snapshots are runtime data. Existing snapshots remain in the local working tree for recovery, are removed from the next source tree, and must not be uploaded to GitHub. See [`server/backups/README.md`](server/backups/README.md). The included empty JSON file documents only the backup envelope.

## Repository checks

The repository has a structural smoke check but no comprehensive automated API authorization, concurrency, database restore, or browser end-to-end test suite. CI status is the source of truth for configured checks. Do not interpret passing lint or a build as verification of the access-control behavior.

## Security limitations

This codebase is a development project. API routes, object-level authorization, database writes, backups, and authentication require review and testing before use with real farm or animal records. No claim of enterprise security, production readiness, or regulatory compliance is made here.
