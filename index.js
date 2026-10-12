// Root entrypoint.
//
// OpenCode V2 resolves local directory plugins through an `index.js` at the
// package root. It does not follow `main`/`exports` for a configured directory
// plugin, so this file must exist next to package.json. It simply re-exports
// the implementation in src/.
export { default, CodeGraphSyncPlugin, CodeGraphSyncPluginV1 } from "./src/index.js";
