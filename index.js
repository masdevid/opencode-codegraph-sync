import { ensureIndex } from "./sync.js"
import { CodeGraphRpc } from "./rpc.js"

// OpenCode V2 plugin (server part).
//
// `setup` subscribes to `session.created` and refreshes the CodeGraph index in
// the background. Sync output is captured and discarded, so nothing is printed.
// When the index actually changes, the TUI part shows a "CodeGraph" toast.
//
// The default export also carries a V1 `server()` entrypoint, so one package
// works on OpenCode 1.18.29+ and on V2. See
// https://opencode.ai/v2/docs/build/plugins/migrate-v1

const ID = "codegraph-autostart"

async function syncAndNotify(rpc, directory) {
  try {
    const result = await ensureIndex(directory)
    if (rpc && result) await rpc.events.emit("synced", { directory, ...result })
  } catch {
    // codegraph not installed, or the index is temporarily locked — ignore.
  }
}

const plugin = {
  id: ID,

  async setup(ctx) {
    const controller = new AbortController()

    // Notification is best-effort: if the RPC contract is unavailable, keep
    // syncing silently instead of failing the plugin.
    let rpc
    try {
      rpc = await ctx.rpc.register(CodeGraphRpc, {})
    } catch {
      rpc = undefined
    }

    void (async () => {
      try {
        for await (const event of ctx.event.subscribe({
          types: ["session.created"],
          signal: controller.signal,
        })) {
          const directory = event.data?.location?.directory ?? ctx.location.directory
          if (!directory) continue

          // Don't let a slow init block later sessions; `ensureIndex` dedupes
          // concurrent runs for the same directory anyway.
          void syncAndNotify(rpc, directory)
        }
      } catch {
        // Subscription aborted during plugin cleanup.
      }
    })()

    return () => {
      // Stop listening for new sessions. Let any in-flight index build finish
      // so an interrupted init never leaves a stale lock behind.
      controller.abort()
    }
  },

  // V1 entrypoint (OpenCode 1.18.29+): returns V1 hooks.
  async server(input) {
    const directory = input?.directory

    return {
      event: async ({ event }) => {
        if (event?.type !== "session.created") return
        try {
          await ensureIndex(directory)
        } catch {
          // Stay silent.
        }
      },
    }
  },
}

export default plugin
