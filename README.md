# 20w14infinite-Hub
Have you ever felt the urge to find new dimensions in Minecraft's 20w14∞ April Fools Update? Well come here! You can put your abominations for everyone to see!

## Run it

```bash
npm start        # serves the Hub on http://localhost:3000
```

## Where your dimensions live (and why they can't be lost)

Nothing is stored in cookies. Data is kept in two places:

1. **The server (permanent).** Every published dimension is stored in `data/dimensions.json` on the server — the shared Hub everyone sees. Clearing your browser's cookies/site data can never touch this file; the site simply re-downloads the full Hub from it on the next visit. The server also keeps automatic rotating snapshots in `data/backups/` (up to 30, written at most once a minute) and will automatically restore the newest readable snapshot if `dimensions.json` is ever corrupted.
2. **Your browser (cache).** A local copy of the Hub, your likes, and any unpublished form draft are cached in **IndexedDB** — a large, durable browser database (localStorage's ~5MB cap would be blown away by screenshot data URLs). If IndexedDB is unavailable, the app falls back to localStorage, then memory. On next load, the local cache is merged up to the server and the server's list wins.

To restore a snapshot manually: stop the server, copy `data/backups/dimensions-<timestamp>.json` over `data/dimensions.json`, and start the server again. The **Export JSON** button in the app also produces a manual backup file you can keep anywhere.
