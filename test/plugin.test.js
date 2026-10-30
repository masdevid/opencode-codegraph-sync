import assert from "node:assert/strict"
import { afterEach, beforeEach, test } from "node:test"
import plugin from "../index.js"
import { project, stubCodegraph } from "./helpers.js"

let stub
const originalPath = process.env.PATH
const originalOutput = process.env.STUB_OUTPUT

beforeEach(() => {
  stub = stubCodegraph()
  process.env.PATH = stub.path
  process.env.STUB_OUTPUT = "Already up to date"
})

afterEach(() => {
  process.env.PATH = originalPath
  if (originalOutput === undefined) delete process.env.STUB_OUTPUT
  else process.env.STUB_OUTPUT = originalOutput
})

async function waitFor(predicate, timeout = 3000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (predicate()) return
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
  throw new Error("timed out waiting for condition")
}

test("default export carries both the V2 and V1 entrypoints", () => {
  assert.equal(plugin.id, "codegraph-autostart")
  assert.equal(typeof plugin.setup, "function")
  assert.equal(typeof plugin.server, "function")
})

test("V2 setup syncs session directories and emits an RPC event", async () => {
  const directory = project({ indexed: true })
  const emitted = []
  const received = new Promise((resolve) => {
    const rpc = {
      events: {
        async emit(name, payload) {
          emitted.push({ name, payload })
          resolve()
        },
      },
    }
    plugin.setup({
      location: { directory },
      rpc: { async register() { return rpc } },
      event: {
        async *subscribe() {
          yield { type: "session.created", data: { location: { directory } } }
          await new Promise(() => {})
        },
      },
    })
  })

  await received

  assert.deepEqual(emitted, [
    {
      name: "synced",
      payload: { directory, mode: "sync", changed: false },
    },
  ])
})

test("V2 falls back to the plugin location when the event has no directory", async () => {
  const directory = project({ indexed: true })
  let emitted

  const dispose = await plugin.setup({
    location: { directory },
    rpc: {
      async register() {
        return { events: { async emit(name, payload) { emitted = { name, payload } } } }
      },
    },
    event: {
      async *subscribe() {
        yield { type: "session.created" }
        await new Promise(() => {})
      },
    },
  })

  await waitFor(() => emitted !== undefined)

  assert.deepEqual(emitted, {
    name: "synced",
    payload: { directory, mode: "sync", changed: false },
  })
  dispose()
})

test("V2 keeps syncing when RPC registration is unavailable", async () => {
  const directory = project({ indexed: true })

  await plugin.setup({
    location: { directory },
    rpc: {
      async register() {
        throw new Error("rpc unavailable")
      },
    },
    event: {
      async *subscribe() {
        yield { type: "session.created", data: { location: { directory } } }
        await new Promise(() => {})
      },
    },
  })

  await waitFor(() => stub.calls().length === 1)
  assert.deepEqual(stub.calls(), [{ cwd: directory, args: "sync" }])
})

test("V1 entrypoint runs init for a new project on session.created", async () => {
  const directory = project()

  const hooks = await plugin.server({ directory })
  await hooks.event({ event: { type: "session.idle" } })

  assert.deepEqual(stub.calls(), [])

  await hooks.event({ event: { type: "session.created" } })

  assert.deepEqual(stub.calls(), [{ cwd: directory, args: "init" }])
})

test("V1 entrypoint swallows a missing codegraph binary", async () => {
  const directory = project()
  process.env.PATH = "/nonexistent"

  const hooks = await plugin.server({ directory })

  await assert.doesNotReject(hooks.event({ event: { type: "session.created" } }))
})
