import path from "node:path";
import os from "node:os";

/**
 * OpenCode Plugin: CodeGraph Sync
 *
 * Automatically syncs the CodeGraph index when a new session is created.
 * If the project isn't indexed yet, runs `codegraph init` instead.
 * Skips execution when the working directory is the home directory (~).
 */
export const CodeGraphSyncPlugin = async (ctx) => {
  const { $, directory } = ctx;

  const runSync = async () => {
    const homeDir = os.homedir();

    if (path.resolve(directory) === path.resolve(homeDir)) {
      console.warn("[codegraph-sync] Skipping: current directory is home directory (~).");
      return;
    }

    try {
      await $`codegraph sync`;
      console.log("[codegraph-sync] CodeGraph sync completed successfully.");
    } catch (err) {
      console.log("[codegraph-sync] CodeGraph sync failed or not initialized yet. Initializing...");
      try {
        await $`codegraph init`;
        console.log("[codegraph-sync] CodeGraph initialized successfully.");
      } catch (initErr) {
        console.error("[codegraph-sync] Failed to initialize CodeGraph:", initErr);
      }
    }
  };

  return {
    event: async ({ event }) => {
      if (event.type === "session.created") {
        await runSync();
      }
    },
  };
};

export default CodeGraphSyncPlugin;
