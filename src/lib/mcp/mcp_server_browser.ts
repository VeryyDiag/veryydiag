import type { DiagramConfClass } from '$lib/contexts/context.svelte';
import { McpServer } from '@modelcontextprotocol/server';
import { type Transport } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';

interface AlertsResponse {
    features: { properties: { event?: string; headline?: string } }[];
}


export function createServer(
  diagramConfClass: DiagramConfClass,
  { getVisibility, transport } : { getVisibility: () => boolean, transport: Transport & { protocolVersion?: string }} ): McpServer
{
  const server = new McpServer({ name: 'proofdiag', version: '0.0.1' });

  // Taken from https://github.com/modelcontextprotocol/typescript-sdk/blob/main/examples/resources/server.ts
  // For backward compatibility with the 2025- area, we need to keep track of the subscribed uris
  const subscribedUris = new Set<string>();
  server.server.setRequestHandler('resources/subscribe', request => {
    subscribedUris.add(request.params.uri);
    return {};
  });
  server.server.setRequestHandler('resources/unsubscribe', request => {
    subscribedUris.delete(request.params.uri);
    return {};
  });
  // For both 2025- and 2026- eras
  const sendURINotification = async (uri: string) => {
    if (transport.protocolVersion === 'modern' || subscribedUris.has(uri)) {
      // Connection serving (stdio): announce in-band. The entry routes it
      // onto 2026-07-28 listen streams; on a 2025-era connection it goes
      // only to subscribers — unsolicited per-resource updates are wrong.
      await server.server.sendResourceUpdated({ uri }).catch(() => {});
    }
  }
  server.registerTool(
    'ping',
    {
      description: 'Returns a string pong with a timestamp',
    },
    async () => {
      const str = `Pong at ${new Date()}`
      return { content: [{ type: 'text', text: str }] };
      // structuredContent does not work yet when the element is not an object:
      // https://github.com/modelcontextprotocol/typescript-sdk/issues/2530
      // content seems to be automatically added by the SDK (needed for backward compatibility)
      // return { structuredContent: str };
    }
  );

  server.registerResource(
    'current-plugin/visibility',
    'veryydiag://current-plugin/visibility',
    {
      title: 'Visibility of the current plugin',
      description: 'Returns true if the plugin is visible, false otherwise',
      mimeType: 'application/json'
    },
    async uri => {
      console.log("[mcp-server] A resource was queried")
      return {
        contents: [{ uri: uri.href, text: `${getVisibility()}` }]
      }
    }
  );

  return server;
}
