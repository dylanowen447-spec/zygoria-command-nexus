# Get zygoria.com loading again

## What I found
- zygoria.com currently shows "This page didn't load" for **everyone**, not only iPhone. The server returns an error before the game can start.
- The game in the editor preview loads fine.
- The fix for this crash (rolling back a broken setup update) went into the project earlier. It only reaches zygoria.com when the site is published again, and that hasn't happened yet. So the live site is still running the broken version.

## Steps
1. You press **Publish** (top right) so zygoria.com gets the fixed version. I won't publish for you.
2. Then I check zygoria.com again, both normally and as an iPhone, and confirm the game loads.
3. If it still fails after publishing, I build the live version myself to find the real error, and fix only that. No game, character or scene changes.

## Technical details
- `curl https://zygoria.com` returns 500 with the platform error page, and the local dev server returns 200.
- `@lovable.dev/vite-tanstack-config` is pinned to 2.25.3. The 2.26.0 `createRequire` crash in the Worker is the suspected cause of the live 500.
- Fallback: run a production build plus a Worker preview locally, and read the SSR error from the logs.
