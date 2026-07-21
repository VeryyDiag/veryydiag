import type { DiagramConfClass } from '$lib/contexts/context.svelte';
import { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';

interface AlertsResponse {
    features: { properties: { event?: string; headline?: string } }[];
}

export function createServer(diagramConfClass: DiagramConfClass): McpServer {
  const server = new McpServer({ name: 'veryydiag', version: '0.0.1' });

  server.registerTool(
    'ping',
    {
      description: 'Returns pong',
    },
    async () => {
      return { content: [{ type: 'text', text: "Pong" }] };
    }
  );

  return server;
}
