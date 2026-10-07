#!/usr/bin/env -S npx vite-node
// See the documentation in the README

import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'node:http';

// ---- CLI args -------------------------------------------------------

interface BridgeOptions {
  port: number;
  host: string;
  path: string;
  help?: boolean;
}

function parseArgs(argv: string[]): BridgeOptions {
  const opts: BridgeOptions = { port: 0, host: '127.0.0.1', path: '/' };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--port' || arg === '-p') {
      opts.port = Number(argv[++i]);
    } else if (arg === '--host') {
      opts.host = argv[++i];
    } else if (arg === '--path') {
      opts.path = argv[++i];
    } else if (arg === '--help' || arg === '-h') {
      opts.help = true;
    }
  }
  return opts;
}

const opts = parseArgs(process.argv.slice(2));

if (opts.help) {
  process.stderr.write(
    `Usage: mcp-ws-server-bridge.ts [--port <port>] [--host <host>] [--path </>]\n` +
      `  --port   Port to listen on. Omit or pass 0 to auto-select a free port.\n` +
      `  --host   Host/interface to bind to (default: 127.0.0.1).\n` +
      `  --path   WebSocket URL path the browser page must connect to (default: /).\n`
  );
  process.exit(0);
}

// ---- logging helper (stderr only - stdout is reserved for JSON-RPC) -

function log(...args: unknown[]): void {
  process.stderr.write(args.join(' ') + '\n');
}

// ---- state ------------------------------------------------------------

let activeSocket: WebSocket | null = null; // the current browser WebSocket connection
const pendingOutbound: string[] = []; // stdin messages queued while no client is connected

// ---- HTTP + WebSocket server -----------------------------------------

const httpServer = createServer((_req, res) => {
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server: httpServer, path: opts.path });

wss.on('connection', (socket: WebSocket, req) => {
  if (activeSocket) {
    // Only one browser page should drive this bridge at a time.
    // Replace the old connection rather than reject the new one,
    // since the old one is probably stale (page reload, etc.).
    log('[bridge] New connection replacing existing one.');
    activeSocket.removeAllListeners();
    activeSocket.close();
  }

  activeSocket = socket;
  log(`[bridge] Browser connected from ${req.socket.remoteAddress}`);

  // Flush anything that was queued up while disconnected.
  while (pendingOutbound.length > 0) {
    socket.send(pendingOutbound.shift() as string);
  }

  socket.on('message', (data: Buffer | ArrayBuffer | Buffer[]) => {
    // Forward browser -> MCP client via stdout, one JSON-RPC message per line.
    const message = data.toString().trim();
    if (message) process.stdout.write(message + '\n');
  });

  socket.on('close', () => {
    log('[bridge] Browser disconnected.');
    if (activeSocket === socket) activeSocket = null;
  });

  socket.on('error', (err: Error) => {
    log('[bridge] WebSocket error:', err.message);
  });
});

// ---- stdin -> WebSocket -------------------------------------------

let stdinBuffer = '';

process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk: string) => {
  stdinBuffer += chunk;
  let newlineIndex: number;
  while ((newlineIndex = stdinBuffer.indexOf('\n')) !== -1) {
    const line = stdinBuffer.slice(0, newlineIndex).trim();
    stdinBuffer = stdinBuffer.slice(newlineIndex + 1);
    if (!line) continue;

    if (activeSocket && activeSocket.readyState === WebSocket.OPEN) {
      activeSocket.send(line);
    } else {
      // No browser connected yet (or it dropped) - queue the message
      // so it isn't lost; it'll be flushed on the next connection.
      pendingOutbound.push(line);
    }
  }
});

process.stdin.on('end', () => {
  log('[bridge] stdin closed, shutting down.');
  httpServer.close(() => process.exit(0));
});

// ---- startup ----------------------------------------------------------

httpServer.listen(opts.port, opts.host, () => {
  const address = httpServer.address();
  const port = typeof address === 'object' && address !== null ? address.port : opts.port;
  const url = `ws://${opts.host}:${port}${opts.path}`;
  log(`[bridge] Listening for browser connections at ${url}`);
});

// ---- clean shutdown -----------------------------------------------

function shutdown(): void {
  log('[bridge] Shutting down.');
  if (activeSocket) activeSocket.close();
  httpServer.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
