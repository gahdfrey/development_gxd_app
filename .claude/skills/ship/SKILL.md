---
name: ship
description: Build CareVault, fix any type and lint errors, push the feature branch, open (or reuse) a pull request into main, and merge it — which deploys to production and auto-applies database migrations. Use when the user says "ship", "/ship", "build and push", "fix lint and push", "push and merge", or "deploy this".
---

# Ship: build → fix → push → PR → merge

Merging into `main` **deploys to production**: Vercel's production build runs `scripts/migrate.mjs`, which applies any pending `drizzle/` migrations to the live database, then releases the code. Treat every step before the merge as the safety check for that.

Work through the steps in order. Stop and report if a step fails in a way you can't fix safely.

## 1. Preflight

```bash
git branch --show-current
git status --short
git fetch origin
```

- **Never ship from `main`.** If the current branch is `main`, stop and ask which feature branch to use (normally `Tiito`).
- If `main` has commits the branch lacks that touch files (`git diff --stat HEAD...origin/main`), merge `origin/main` into the branch first and resolve any conflicts. Merge-only commits with no file changes can be ignored.
- Uncommitted changes are part of what gets shipped: list them for the user in the final summary.

## 2. Type errors

```bash
npx tsc --noEmit -p .
```

Fix every error, then re-run until it exits cleanly. Rules:
- Fix the real cause: correct the type, narrow it, or add the missing field. Don't use `any`, `@ts-ignore`, or `as unknown as`, and don't loosen `tsconfig.json`.
- Keep the code's behavior the same. If a type error points to a real bug, fix it in the smallest way, and name it in the summary.
- Match the surrounding code's style.

## 3. Lint errors

```bash
npm run lint
```

Fix every **error**. Warnings are fine to leave, but mention the count. Rules:
- No blanket `eslint-disable`, and no rule changes in `eslint.config.mjs`. A single-line `eslint-disable-next-line <rule>` is OK only when the code is right and the rule can't see why. Add a one-line comment saying why, like the existing ones in `app/components/ui/Table.tsx`.
- Re-run until clean, then re-run step 2, because lint fixes can break types.

## 4. Production build

```bash
npx next build
```

Use `npx next build`, **not** `npm run build`. `npm run build` also runs migrations against whatever `.env` points at, and migrations belong in step 5.

If the build fails, fix the cause and go back to step 2.

## 5. Database migrations

Check for schema changes that never got a migration:

```bash
npx drizzle-kit generate < /dev/null
```

- **"No schema changes, nothing to migrate"** is the good case. Continue.
- **It created a new `drizzle/NNNN_*.sql` file:** `schema.ts` changed without a migration, and production would have been missing the change. Keep the file, and show the user the SQL.

Then list the migrations this merge will apply to production, which are the `drizzle/*.sql` files new on this branch:

```bash
git diff --name-only --diff-filter=A origin/main...HEAD -- drizzle/ ; git status --short drizzle/
```

For each pending migration:
- Apply it to the **dev branch** first and confirm it works: `npm run db:migrate`. Before running, check that `.env`'s `DATABASE_URL` host is the Neon dev branch (`ep-spring-snow-…`). **Never** run it if the host is production (`ep-broad-base-zauzqj23`). Stop and tell the user instead.
- **Destructive SQL needs explicit confirmation.** If a migration contains `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, `DELETE FROM`, `ALTER COLUMN … TYPE`, or `SET NOT NULL` on an existing column, stop. Show the statements and get a clear yes before merging. Remind the user: drops come *after* the code that stopped using the column is live.
- `CREATE INDEX CONCURRENTLY` can't run inside the migrator's transaction. Use plain `CREATE INDEX`.
- Never edit a migration that's already on `main`. Add a new one instead.

## 6. Commit and push

- Commit the fixes as a separate commit with a clear message, for example `fix: resolve type and lint errors`. Commit any uncommitted feature work the user asked to ship with its own message. Follow the repo's `feat:` / `fix:` / `refactor:` style.
- End each commit message with the attribution line from the current session's instructions, if one is given.
- Push the branch: `git push -u origin <branch>`. Never push directly to `main`, and never force-push.

## 7. Pull request into main

The GitHub CLI is installed at `~/.local/bin/gh`. If `gh` isn't found, run `export PATH="$HOME/.local/bin:$PATH"`. If it still isn't installed or isn't logged in (`gh auth status`), stop after pushing. Give the user `https://github.com/gahdfrey/development_gxd_app/compare/main...<branch>?expand=1` and a PR title and description to paste.

```bash
gh pr list --head <branch> --base main --state open --json number,url
```

- **An open PR already exists:** reuse it. The push already updated it.
- **No open PR:** create one with `gh pr create --base main --head <branch> --title "…" --body "…"`. The body should have:
  - **Summary:** bullets of what changed.
  - **Migrations:** each pending migration file and what it does, or "None".
  - **Test plan:** what you checked in steps 2–5, plus a box for the production build log.
  - End the body with the PR attribution line from the session's instructions, if one is given.

## 8. Wait for checks, then merge

```bash
gh pr checks <number> --watch
```

- Vercel's preview build should pass. Its log says `[migrate] Skipping: preview build`. If a check fails, read the failure and fix it on the branch, going back to step 2. Never merge with failing checks.
- Before merging, give the user a short summary: the commits going out, the pending migrations, and any warnings. Then merge. If a migration is destructive, step 5 already needed their yes.
- Merge with a merge commit, as this repo does (`Merge pull request #N from gahdfrey/<branch>`):

```bash
gh pr merge <number> --merge
```

Don't use `--admin` or `--auto`, and don't delete the branch: `Tiito` is reused.

## 9. After the merge

- Bring the branch up to date: `git fetch origin && git merge --ff-only origin/main`. If it isn't a fast-forward, use a plain `git merge origin/main`.
- Tell the user the merge commit and PR link, and what to look for in Vercel's **production** build log:
  - With migrations: `[migrate] Applied N migration(s).`
  - Without migrations: `[migrate] Nothing to apply; database is up to date.`
- If the production build fails, the previous deployment keeps serving. Ask the user for the build log's error lines and fix forward on the branch.

## Final summary for the user

Keep it short:
- **Type errors fixed:** count, with any real bugs named.
- **Lint:** errors fixed, warnings left.
- **Build:** result.
- **Migrations:** shipped, or none.
- **PR and merge:** the PR link and merge commit.
- **Next:** what to check in the production build log.
