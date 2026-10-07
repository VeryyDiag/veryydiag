# WebsocketToMcp

This bridges a browser page implementing a MCP server to a local stdio MCP client:

```
MCP client  <-- stdio -->  this bridge  <-- WebSocket -->  browser page
```

This is a super-simple script that just forwards websocket to stdio: you may also actually prefer to simply use existing tools like `websocat -s <port>`.

## Usage

```
$ ./websocketToMcp.ts [--port <port>] [--host <host>] [--path </>]
```

or

```
$ npx vite-node src/tools/websocketToMcp/ [--port <port>] [--host <host>] [--path </>]
```

If `--port` is omitted (or set to `0`), an available port is chosen automatically by the OS, and it's printed to stderr so you can wire it into your browser page.
