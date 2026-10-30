# opencode-codegraph-sync

An [OpenCode](https://opencode.ai) plugin that keeps your [CodeGraph](https://github.com/anomalyco/codegraph) index fresh every time you start a new session.

Works with **OpenCode V2** and **OpenCode V1 (1.18.29+)** from the same package.

## Why

CodeGraph gives OpenCode sub-millisecond code intelligence by maintaining a parsed knowledge graph of your project, but the index can drift as files change. This plugin makes sure it is current:

- **No index yet?** It runs `codegraph init --yes` once.
- **Already indexed?** It runs `codegraph sync` — fast and incremental.
- **Nothing to do?** It stays completely silent.

CodeGraph then keeps itself current through its own file watcher.

## Requirements

- [OpenCode](https://opencode.ai), V2 or V1 `1.18.29`+
- [`codegraph`](https://github.com/anomalyco/codegraph) available in your `PATH`

```bash
npm install -g codegraph
```

> V1 releases older than `1.18.29` cannot load the combined V1/V2 entrypoint. Use an older release of this plugin (or V2) on those versions.

## Install

### OpenCode V2

Clone it into the global plugin directory:

```bash
git clone https://github.com/masdevid/opencode-codegraph-sync.git \
  ~/.config/opencode/plugins/opencode-codegraph-sync
```

Or point to it explicitly in `~/.config/opencode/opencode.jsonc`:

```jsonc
{
  "plugins": [
    "/absolute/path/to/opencode-codegraph-sync"
  ]
}
```

Configured local plugin paths must be **directories**, not files.

### OpenCode V1

Install the package into your config directory:

```bash
cd ~/.config/opencode
npm install github:masdevid/opencode-codegraph-sync
```

Then register it in `~/.config/opencode/opencode.json`:

```jsonc
{
  "plugin": [
    "opencode-codegraph-sync"
  ]
}
```

### npm

Once published to npm, the package name can be used directly in either config:

```jsonc
// V2
{ "plugins": ["opencode-codegraph-sync"] }

// V1
{ "plugin": ["opencode-codegraph-sync"] }
```

### Verify

Start OpenCode in a project. The first session creates `.codegraph/`; later sessions refresh it. You can confirm the plugin is loaded in the OpenCode plugin list or logs.

## Behavior

On every `session.created` event:

1. **Home directory is skipped** — OpenCode never tries to index your entire home directory.
2. **`.codegraph/` is missing** — runs `codegraph init --yes` and waits for it.
3. **`.codegraph/` exists** — runs `codegraph sync` in the background.
4. **Output is discarded** — nothing is printed over the terminal UI.
5. **Concurrent sessions are deduped** — one sync per project directory at a time.
6. **Failures are swallowed** — if CodeGraph is missing or the index is locked, OpenCode keeps working.

### Notification

In V2, when a sync actually changes the index (or a first-time init completes), the TUI shows a short toast:

> **CodeGraph** — Synced `~/Projects/app`

No-op syncs (`Already up to date`) stay silent.

## Structure

```
opencode-codegraph-sync/
├── index.js     # Server part: V2 setup() + V1 server() entrypoint
├── sync.js      # init/sync spawn logic, dedupe, home-directory guard
├── tui.js       # TUI part: toast when the index changed
├── rpc.js       # Shared RPC contract between server and TUI
├── test/        # node:test suites with a stub codegraph binary
└── package.json
```

The package has no runtime dependencies.

## Development

```bash
git clone https://github.com/masdevid/opencode-codegraph-sync.git
cd opencode-codegraph-sync

# No install step needed: tests use node:test and a stub binary.
npm test
```

The tests cover:

- `init --yes` for unindexed projects
- `sync` with changed / unchanged output
- silence (output never reaches stdout)
- home-directory and missing-directory skips
- per-directory dedupe and failure recovery
- the V2 `setup()` subscription and RPC notification
- the V1 `server()` entrypoint
- TUI toast behavior and fallbacks

## Uninstall

Remove the clone or npm package, then delete the entry from your OpenCode config.

## License

MIT
