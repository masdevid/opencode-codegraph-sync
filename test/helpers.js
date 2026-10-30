import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

/**
 * Install a fake `codegraph` binary first in PATH.
 *
 * Records each call as `<cwd>|<args>` in a log file, optionally sleeps, and
 * prints `STUB_OUTPUT` (default: "Already up to date") before exiting with
 * `STUB_EXIT`.
 */
export function stubCodegraph() {
  const root = mkdtempSync(join(tmpdir(), "codegraph-stub-"))
  const bin = join(root, "bin")
  const log = join(root, "calls.log")
  const script = join(bin, "codegraph")
  mkdirSync(bin)

  writeFileSync(
    script,
    [
      "#!/bin/sh",
      `printf '%s|%s\\n' "$PWD" "$*" >> "${log}"`,
      'sleep "${STUB_SLEEP:-0}"',
      'printf "%s" "${STUB_OUTPUT:-Already up to date}"',
      'exit "${STUB_EXIT:-0}"',
      "",
    ].join("\n"),
  )
  chmodSync(script, 0o755)

  return {
    root,
    log,
    path: `${bin}:${process.env.PATH ?? ""}`,
    calls() {
      if (!existsSync(log)) return []
      return readFileSync(log, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          const [cwd, args] = line.split("|")
          return { cwd, args }
        })
    },
    reset() {
      writeFileSync(log, "")
    },
  }
}

export function project({ indexed = false } = {}) {
  // macOS resolves /var to /private/var in child-process cwd, so compare the
  // canonical path everywhere.
  const directory = realpathSync(mkdtempSync(join(tmpdir(), "codegraph-project-")))
  if (indexed) mkdirSync(join(directory, ".codegraph"))
  return directory
}
