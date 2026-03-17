# TicketFlow — Claude Code Notes

## Database Migrations

This project uses `prisma migrate` (not `prisma db push`) to manage schema changes safely.

**When you change `prisma/schema.prisma`, always run:**

```bash
npx prisma migrate dev --name describe_your_change
```

This generates a new SQL file in `prisma/migrations/`, applies it to your local DB, and on next deploy `prisma migrate deploy` (called automatically by `start.sh` and `entrypoint.sh`) will run it against production.

**Never use `prisma db push`** — it has no migration history and can cause destructive changes in production without warning.
