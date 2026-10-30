import { CodeGraphRpc } from "./rpc.js"

// TUI part: show a short toast only when the server part actually changed the
// index. No-op syncs stay silent.
export default {
  id: "codegraph-autostart.tui",

  setup(context) {
    let rpc
    try {
      rpc = context.client.rpc(CodeGraphRpc)
    } catch {
      // RPC unavailable (older server, or server part disabled): nothing to do.
      return
    }

    return rpc.events.on("synced", (event) => {
      const { directory, mode, changed } = event.data
      if (!changed) return

      let path = directory
      try {
        path = context.ui.format.path(directory)
      } catch {
        // Keep the absolute path if formatting is unavailable.
      }

      try {
        context.ui.toast.show({
          title: "CodeGraph",
          message: mode === "init" ? `Indexed ${path}` : `Synced ${path}`,
          variant: "success",
          duration: 3000,
        })
      } catch {
        // A missing toast host must never break the sync path.
      }
    })
  },
}
