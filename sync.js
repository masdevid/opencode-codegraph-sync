import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import { homedir } from "node:os"
import { join, resolve } from "node:path"

// Shared sync logic for the V1 and V2 entrypoints.
//
// Every new session (app launch + Ctrl+N) makes sure the CodeGraph index for
// this project exists and is fresh. The first run does a full `codegraph init`
// (which also builds the index); later runs do a fast incremental
// `codegraph sync`. CodeGraph then keeps itself current via its file watcher.

const CODEGRAPH_BIN = "codegraph"

// Dedupe concurrent runs for the same directory (e.g. several sessions opened
// at once) so we never build the same index twice in parallel.
const inflight = new Map()

export function isHomeDirectory(directory) {
  if (!directory) return true
  return resolve(directory) === resolve(homedir())
}

function runCodegraph(args, cwd) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(CODEGRAPH_BIN, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
      windowsHide: true,
    })

    // Output is captured only so we can tell whether `sync` changed anything.
    // It is never printed: writing to stdout from a plugin corrupts the TUI.
    let output = ""
    child.stdout.setEncoding("utf8")
    child.stderr.setEncoding("utf8")
    child.stdout.on("data", (chunk) => {
      output += chunk
    })
    child.stderr.on("data", (chunk) => {
      output += chunk
    })

    child.once("error", reject)
    child.once("exit", (code, signal) => {
      if (code === 0) resolvePromise(output)
      else reject(new Error(`codegraph ${args.join(" ")} exited with ${signal ?? code}`))
    })
  })
}

/**
 * Ensure the CodeGraph index for `directory` exists and is fresh.
 *
 * Returns `{ mode: "init" | "sync", changed: boolean }`, or `undefined` when
 * the directory is not indexable (missing, or the home directory).
 */
export function ensureIndex(directory) {
  if (!directory || isHomeDirectory(directory)) return Promise.resolve(undefined)

  const pending = inflight.get(directory)
  if (pending) return pending

  const task = (async () => {
    if (!existsSync(join(directory, ".codegraph"))) {
      // First time: full init. Awaited by the caller so the index is ready.
      // No `--yes`: current CodeGraph CLI releases don't accept it, and
      // `init` is already non-interactive.
      await runCodegraph(["init"], directory)
      return { mode: "init", changed: true }
    }

    // Already indexed: incremental refresh. The CLI prints "Already up to
    // date" when there was nothing to do; that run should stay silent.
    const output = await runCodegraph(["sync"], directory)
    return { mode: "sync", changed: !/already up to date/i.test(output) }
  })().finally(() => inflight.delete(directory))

  inflight.set(directory, task)
  return task
}
