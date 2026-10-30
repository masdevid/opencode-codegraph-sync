import assert from "node:assert/strict"
import { test } from "node:test"
import tui from "../tui.js"

function context({ formatPath = (p) => p } = {}) {
  let handler
  const toasts = []
  return {
    toasts,
    context: {
      client: {
        rpc(definition) {
          assert.equal(definition.id, "codegraph-autostart")
          return {
            events: {
              on(name, callback) {
                assert.equal(name, "synced")
                handler = callback
                return () => {
                  handler = undefined
                }
              },
            },
          }
        },
      },
      ui: {
        format: { path: formatPath },
        toast: { show: (toast) => toasts.push(toast) },
      },
    },
    emit(data) {
      handler({ data })
    },
    get subscribed() {
      return handler !== undefined
    },
  }
}

test("shows an indexed toast on init", () => {
  const harness = context()
  const dispose = tui.setup(harness.context)

  harness.emit({ directory: "/tmp/app", mode: "init", changed: true })

  assert.deepEqual(harness.toasts, [
    { title: "CodeGraph", message: "Indexed /tmp/app", variant: "success", duration: 3000 },
  ])
  assert.equal(harness.subscribed, true)
  dispose()
})

test("shows a synced toast when the index changed", () => {
  const harness = context({ formatPath: (p) => p.replace("/tmp/", "") })
  tui.setup(harness.context)

  harness.emit({ directory: "/tmp/app", mode: "sync", changed: true })

  assert.deepEqual(harness.toasts, [
    { title: "CodeGraph", message: "Synced app", variant: "success", duration: 3000 },
  ])
})

test("stays silent when nothing changed", () => {
  const harness = context()
  tui.setup(harness.context)

  harness.emit({ directory: "/tmp/app", mode: "sync", changed: false })

  assert.deepEqual(harness.toasts, [])
})

test("falls back to the absolute path when formatting fails", () => {
  const harness = context({
    formatPath() {
      throw new Error("no formatter")
    },
  })
  tui.setup(harness.context)

  harness.emit({ directory: "/tmp/app", mode: "sync", changed: true })

  assert.equal(harness.toasts[0].message, "Synced /tmp/app")
})

test("does nothing when the RPC client is unavailable", () => {
  assert.doesNotThrow(() =>
    tui.setup({
      client: {
        rpc() {
          throw new Error("rpc unavailable")
        },
      },
    }),
  )
})
