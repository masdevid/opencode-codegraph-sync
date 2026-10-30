// Shared RPC contract between the server part (runs the sync) and the TUI part
// (shows the toast). A plain definition object avoids a build step; Rpc.define
// is an identity helper, so this is the same shape it produces.
export const CodeGraphRpc = {
  id: "codegraph-autostart",
  methods: {},
  events: {
    synced: {
      schema: {
        type: "object",
        properties: {
          directory: { type: "string" },
          mode: { type: "string", enum: ["init", "sync"] },
          changed: { type: "boolean" },
        },
        required: ["directory", "mode", "changed"],
        additionalProperties: false,
      },
    },
  },
}
