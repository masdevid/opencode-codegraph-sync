import assert from "node:assert/strict"
import { afterEach, beforeEach, test } from "node:test"
import { mkdirSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { ensureIndex, isHomeDirectory } from "../sync.js"
import { project, stubCodegraph } from "./helpers.js"

let stub
const originalPath = process.env.PATH
const original = {}
for (const key of ["STUB_OUTPUT", "STUB_EXIT", "STUB_SLEEP"]) original[key] = process.env[key]

beforeEach(() => {
  stub = stubCodegraph()
  process.env.PATH = stub.path
  delete process.env.STUB_OUTPUT
  delete process.env.STUB_EXIT
  delete process.env.STUB_SLEEP
})

afterEach(() => {
  process.env.PATH = originalPath
  for (const [key, value] of Object.entries(original)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

test("initializes a project that has no .codegraph directory", async () => {
  const directory = project()

  const result = await ensureIndex(directory)

  assert.deepEqual(result, { mode: "init", changed: true })
  assert.deepEqual(stub.calls(), [{ cwd: directory, args: "init" }])
})

test("syncs an indexed project and reports no change when up to date", async () => {
  const directory = project({ indexed: true })

  const result = await ensureIndex(directory)

  assert.deepEqual(result, { mode: "sync", changed: false })
  assert.deepEqual(stub.calls(), [{ cwd: directory, args: "sync" }])
})

test("reports a change when sync is not up to date", async () => {
  const directory = project({ indexed: true })
  process.env.STUB_OUTPUT = "Synced 3 files"

  const result = await ensureIndex(directory)

  assert.deepEqual(result, { mode: "sync", changed: true })
})

test("skips the home directory", async () => {
  assert.equal(isHomeDirectory(homedir()), true)

  const result = await ensureIndex(homedir())

  assert.equal(result, undefined)
  assert.deepEqual(stub.calls(), [])
})

test("skips a missing directory value", async () => {
  assert.equal(await ensureIndex(undefined), undefined)
  assert.deepEqual(stub.calls(), [])
})

test("dedupes concurrent runs for the same directory", async () => {
  const directory = project({ indexed: true })
  process.env.STUB_SLEEP = "0.2"

  const [first, second] = await Promise.all([ensureIndex(directory), ensureIndex(directory)])

  assert.deepEqual(first, { mode: "sync", changed: false })
  assert.equal(first, second)
  assert.equal(stub.calls().length, 1)
})

test("clears the in-flight entry after a failure so a retry can run", async () => {
  const directory = project({ indexed: true })
  process.env.STUB_EXIT = "1"

  await assert.rejects(ensureIndex(directory), /exited with 1/)

  delete process.env.STUB_EXIT
  const result = await ensureIndex(directory)

  assert.deepEqual(result, { mode: "sync", changed: false })
  assert.equal(stub.calls().length, 2)
})

test("treats a nested .codegraph as indexed", async () => {
  const directory = project()
  mkdirSync(join(directory, ".codegraph"))

  const result = await ensureIndex(directory)

  assert.deepEqual(result, { mode: "sync", changed: false })
})
