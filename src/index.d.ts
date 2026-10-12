/**
 * OpenCode V2 plugin definition. `id` and `setup` are the stable contract; the
 * default export also carries a V1 `server()` entrypoint for OpenCode 1.18.29+.
 */
export interface CodeGraphSyncPlugin {
  readonly id: "codegraph-sync";
  readonly setup: (ctx: unknown) => (() => void) | void;
}

export declare const CodeGraphSyncPlugin: CodeGraphSyncPlugin;
export declare const CodeGraphSyncPluginV1: (ctx: unknown) => Promise<{
  event: (input: { event: { type?: string } }) => Promise<void>;
}>;

declare const _default: CodeGraphSyncPlugin & {
  server: typeof CodeGraphSyncPluginV1;
};
export default _default;
