<script lang="ts">
  import { onMount } from "svelte"
  import { getContextDiagram } from "$lib/contexts/context.svelte";
  import Icon from '@iconify/svelte'; // https://icon-sets.iconify.design/
  import { McpServer, type JSONRPCMessage, type Transport } from '@modelcontextprotocol/server';

  import { stylePanel, styleButton, styleButtonEnabled, styleButtonDisabled, dividerStyle, styleSelected } from "./commonStyles.svelte"
  import { createServer } from "$lib/mcp/mcp_server_browser";
  let diagramConfClass = getContextDiagram()

  let {
    name, url, code, visible, close
  } : {
    name: string,
    url?: string,
    code?: string,
    visible: boolean,
    close: () => void
  } = $props()

  // onMount(() => {
  //   if (iframeRef) {
  //     iframeRef.contentWindow?.postMessage({
  //       isProofdiagMsg: true,
  //       kind: "plugin.init",
  //       pluginName: name
  //     }, '*')
  //     console.log("Sent message")
  //   }
  // })

  // Notify the plugin when it is shown/hidden to the user
  // $effect(() => {
  //   if (iframeRef) {
  //     console.log("Will notify visibility change", visible)
  //     iframeRef.contentWindow?.postMessage({
  //       isProofdiagMsg: true,
  //       kind: "plugin.visibility.changed",
  //       visible: visible
  //     }, '*')
  //   }
  // })

  let iframeRef : HTMLIFrameElement | null

  class IframeTransport implements Transport {
    onclose = () => {};

    onerror = (error: Error) => {
      console.log("Error in the transport", error)
    }

    onmessage = (message: JSONRPCMessage) => {
      console.log("We just received a message from the plugin, the rest is handled by the SDK that overwrites this function")
    }

    start = async () => {
      // Open your channel here. The loopback has nothing to open.
      console.log("Starting the channel")
    }

    send = async (message: JSONRPCMessage): Promise<void> => {
      console.log("Sending the message to the plugin", message)
      if (iframeRef) {
        iframeRef.contentWindow?.postMessage(message, '*')
      } else {
        console.log("iframeRef was undefined, so impossible to send to the plugin")
      }
    }

    close = async () => {
      console.log("Closing the transport")
      this.onclose?.();
    }

    protocolVersion?: string;

    setProtocolVersion(version: string): void {
      this.protocolVersion = version;
    }
  }
  const iframeTransport = new IframeTransport()
  const mcpServer = createServer(diagramConfClass, {getVisibility: () => visible, transport: iframeTransport})
  await mcpServer.connect(iframeTransport)
  console.log("onmessage after connect:", iframeTransport.onmessage.toString())

  // Listen to plugins messages
  onMount(() => {
    window.addEventListener("message", (e) => {
      if (e.source === iframeRef?.contentWindow) {
        // Received a message from the current plugin
        console.log("Received a message from a plugin", e)
        iframeTransport.onmessage(e.data)
      }
    })
  })
</script>

<div class={["absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-4/10 h-7/10 flex flex-col items-center gap-2 p-7 overflow-x-auto overflow-y-auto", stylePanel, !visible ? "invisible" : "" ]}>
  <!-- Floating close icon -->
  <button
    class={["absolute top-2 right-2 w-8 h-8 flex items-center justify-center !rounded-full hover:bg-blue-100", stylePanel]}
    aria-label="Close plugin window"
    onclick={close}
  >
    <Icon icon="material-symbols:close-rounded" width="20" height="20" />
  </button>
  <h1 class="text-center text-lg font-normal text-body">Plugin</h1>
  <iframe width="100%" height="100%" srcdoc={code} src={url} bind:this={iframeRef} title={`Plugin iframe ${name}`} sandbox="allow-scripts allow-popups allow-forms"></iframe>
</div>
