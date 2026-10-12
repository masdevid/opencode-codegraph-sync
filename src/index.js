import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * OpenCode Plugin: CodeGraph Sync
 *
 * Automatically syncs the CodeGraph index when a new session is created.
 * If the project isn't indexed yet, runs `codegraph init` instead.
 * Skips execution when the working directory is the home directory (~).
 *
 * The plugin runs inside the OpenCode server process, so it must never write to
 * stdout/stderr: any console output would be printed over the terminal UI.
 * Every failure is swallowed on purpose — the plugin is completely silent.
 *
 * The package exports the OpenCode V2 definition (an object with a stable `id`
 * and a `setup` function) together with a V1 `server()` entrypoint so the same
 * package keeps working on OpenCode 1.18.29+.
 */

const runCodegraph = (args, cwd) =>
  execFileAsync("codegraph", args, { cwd, windowsHide: true });

const isHomeDirectory = (directory) =>
  path.resolve(directory) === path.resolve(os.homedir());

/** Sync the index, falling back to `init` when the project isn't indexed yet. */
const runSync = async (directory) => {
  if (isHomeDirectory(directory)) return;

  try {
    await runCodegraph(["sync"], directory);
  } catch {
    try {
      await runCodegraph(["init"], directory);
    } catch {
      // Not indexable — stay silent.
    }
  }
};

/**
 * V2 plugin: register an event subscription during setup and abort it on unload.
 */
export const CodeGraphSyncPlugin = {
  id: "codegraph-sync",
  setup(ctx) {
    const controller = new AbortController();

    void (async () => {
      try {
        for await (const event of ctx.event.subscribe({ signal: controller.signal })) {
          if (event?.type === "session.created") {
            await runSync(ctx.location.directory);
          }
        }
      } catch {
        // Stream aborted on unload, or the subscription failed — stay silent.
      }
    })();

    return () => controller.abort();
  },
};

/**
 * V1 entrypoint (OpenCode 1.18.29+ object form).
 */
export const CodeGraphSyncPluginV1 = async (ctx) => {
  const directory = ctx.directory;

  return {
    event: async ({ event }) => {
      if (event?.type === "session.created") {
        await runSync(directory);
      }
    },
  };
};

export default {
  ...CodeGraphSyncPlugin,
  server: CodeGraphSyncPluginV1,
};
