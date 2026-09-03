import type { DiagramConfClass } from '$lib/contexts/context.svelte';
import { McpServer } from '@modelcontextprotocol/server';
import type { Transport, McpRequestContext } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';

interface AlertsResponse {
    features: { properties: { event?: string; headline?: string } }[];
}


export function createServer(
  diagramConfClass: DiagramConfClass,
  { getVisibility, reqCtx } : { getVisibility: () => boolean, reqCtx: McpRequestContext} ): McpServer
{
  const server = new McpServer({ name: 'proofdiag', version: '0.0.1' }, {
    capabilities: {
      tools: {},
      resources: { subscribe: true, listChanged: true },
    }
  });

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
    if (reqCtx.era === 'modern' || subscribedUris.has(uri)) {
      // Connection serving (stdio): announce in-band. The entry routes it
      // onto 2026-07-28 listen streams; on a 2025-era connection it goes
      // only to subscribers — unsolicited per-resource updates are wrong.
      await server.server.sendResourceUpdated({ uri }).catch((e) => {console.error("Error in sendResourceUpdated", e)});
    }
  }

  const myRegisterResource = (uri: string, title: string, description: string, getResource: () => unknown) => {
    server.registerResource(
      uri,
      uri,
      {
        title: title,
        description: description,
        mimeType: 'application/json'
      },
      async uri => {
        return {
          contents: [{ uri: uri.href, text: `${getResource()}` }]
        }
      }
    );
    // Trigger update
    try {
      const destroy = $effect.root(() => {
        let ready = false;
        $effect(() => {
          const v = getResource();
          if (ready) {
            sendURINotification(uri)
          } else {
            // We can't send sendURINotification the first time (mounting) as the server is not yet ready anyway
            ready = true
          }
        })
        return () => {
		      // cleanup
	      };
      })
    } catch (e) {
      console.error("ERROR in effect", e)
    }
  }


  // Dummy tool to test connectivity etc
  server.registerTool(
    'ping',
    {
      description: 'Returns a string pong with a timestamp',
      outputSchema: z.string()
    },
    async () => {
      const str = `Pong at ${new Date()}`
      return {
        // Typescript error if not present https://github.com/modelcontextprotocol/typescript-sdk/issues/2755
        content: [{ type: 'text', text: str }],
        structuredContent: str
      };
    }
  );

  // Send notification when plugin gets in view
  myRegisterResource(
    'veryydiag://current-plugin/visibility',
    'Visibility of the current plugin',
    'Returns true if the plugin is visible, false otherwise',
    getVisibility
  )

  return server;
}
