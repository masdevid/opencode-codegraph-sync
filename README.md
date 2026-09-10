# opencode-codegraph-sync

An [OpenCode](https://opencode.ai) plugin that automatically syncs your [CodeGraph](https://github.com/anomalyco/codegraph) index every time you start a new session.

## Why

CodeGraph gives opencode sub-millisecond code intelligence by maintaining a parsed knowledge graph of your project. But the index can drift out of sync as files change. This plugin ensures your CodeGraph is always fresh — it runs `codegraph sync` (or `codegraph init` if the project isn't indexed yet) on every `session.created` event.

## Prerequisites

- [opencode](https://opencode.ai) installed
- [codegraph](https://github.com/anomalyco/codegraph) CLI available in your `PATH`

```bash
# Install codegraph if you haven't
npm install -g codegraph
```

## Install

```bash
# From npm (when published)
opencode plugin opencode-codegraph-sync --global

# From a local path
opencode plugin /path/to/opencode-codegraph-sync --global

# From a git repo
opencode plugin git+https://github.com/idhamhill/opencode-codegraph-sync.git --global
```

### Verify

Check your global config to confirm it's registered:

```bash
cat ~/.config/opencode/opencode.json | jq .plugin
```

You should see `"opencode-codegraph-sync"` (or the path you installed from) in the array.

## How It Works

The plugin hooks into opencode's `session.created` event:

1. **Skip if in home directory** — won't try to index `~`
2. **Run `codegraph sync`** — updates the existing index for the current project
3. **Fall back to `codegraph init`** — if sync fails (project not yet indexed), initializes a fresh index
4. **Logs status** — all output is prefixed with `[codegraph-sync]` for easy filtering

## Configuration

None required. The plugin works out of the box.

If you want to customize the behavior, you can set environment variables that affect the `codegraph` CLI itself (see [codegraph docs](https://github.com/anomalyco/codegraph)).

## Uninstall

```bash
opencode plugin opencode-codegraph-sync --uninstall --global
```

Or manually remove it from `~/.config/opencode/opencode.json`:

```json
{
  "plugin": [
    "opencode-vibeguard",
    "opencode-scheduler",
    "opencode-mem"
  ]
}
```

Remove the entry for `opencode-codegraph-sync`.

## Development

```bash
git clone https://github.com/idhamhill/opencode-codegraph-sync.git
cd opencode-codegraph-sync
npm install

# Test locally — install from local path
opencode plugin ./ --global
```

### Project Structure

```
opencode-codegraph-sync/
├── src/
│   ├── index.js        # Plugin implementation
│   └── index.d.ts      # TypeScript declarations
├── package.json
├── tsconfig.json
├── LICENSE
├── .gitignore
└── README.md
```

## License

MIT
