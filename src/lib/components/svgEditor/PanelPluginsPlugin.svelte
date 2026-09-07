<script lang="ts">
  import { onMount } from "svelte"
  import { getContextDiagram } from "$lib/contexts/context.svelte";
  import Icon from '@iconify/svelte'; // https://icon-sets.iconify.design/
  import { McpServer, type JSONRPCMessage, type Transport } from '@modelcontextprotocol/server';
  import { serveStdio } from '@modelcontextprotocol/server/stdio';

  import { stylePanel, styleButton, styleButtonEnabled, styleButtonDisabled, dividerStyle, styleSelected } from "./commonStyles.svelte"
  import { createServer } from "$lib/mcp/mcp_server_browser.svelte";
  let diagramConfClass = getContextDiagram()

  let {
    name, url, code, visible, close, deletePlugin
  } : {
    name: string,
    url?: string,
    code?: string,
    visible: boolean,
    close: () => void,
    deletePlugin: () => void,
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
      console.log(`We just received a message from the plugin, the rest is handled by the SDK that overwrites this function ${JSON.stringify(message)}`, message)
    }

    start = async () => {
      // Open your channel here. The loopback has nothing to open.
      console.log("Starting the channel")
    }

    send = async (message: JSONRPCMessage): Promise<void> => {
      console.log(`Sending the message to the plugin ${JSON.stringify(message)}`, message)
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
  // const mcpServer = createServer(diagramConfClass, {getVisibility: () => visible, transport: iframeTransport})
  // await mcpServer.connect(iframeTransport)
  // console.log("onmessage after connect:", iframeTransport.onmessage.toString())
  serveStdio(reqCtx => {
    return createServer(diagramConfClass, {getVisibility: () => visible, reqCtx})
  }, {
    transport: iframeTransport
  })


  // Listen to plugins messages
  onMount(() => {
    window.addEventListener("message", (e) => {
      if (e.source === iframeRef?.contentWindow) {
        // Received a message from the current plugin
        console.log(`Received a message from a plugin ${JSON.stringify(e?.data)}`, e?.data)
        iframeTransport.onmessage(e.data)
      }
    })
  })
</script>

<div class={["absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-4/10 h-7/10 flex flex-col items-center gap-2 p-7 overflow-x-auto overflow-y-auto", stylePanel, !visible ? "invisible" : "" ]}>
  <!-- Floating delete icon (different size so that we don't accidently click it) -->
  <button
    class={["absolute top-2 left-2 w-8 h-8 flex items-center justify-center !rounded-full hover:bg-blue-100", stylePanel]}
    title="Delete plugin"
    onclick={deletePlugin}
    >
    <Icon icon="mdi:trash-outline" width="20" height="20" />
  </button>
  <!-- Floating close icon -->
  <button
    class={["absolute top-2 right-2 w-8 h-8 flex items-center justify-center !rounded-full hover:bg-blue-100", stylePanel]}
    title="Close plugin window"
    onclick={close}
  >
    <Icon icon="material-symbols:close-rounded" width="20" height="20" />
  </button>
  <h1 class="text-center text-lg font-normal text-body">{name} plugin</h1>
  <!--
     - allow-popups: external links in plugins can be opened in new tab
     - allow-popups-to-escape-sandbox: without this, we get an error NS_ERROR_DOM_COOP_FAILED when a plugin tries to open a link in a new tab.
     - allow-same-origin: without this, plugins can't fetch external libs etc. Even a basic URL plugin with a svelte backend won't be able to run JS.
  -->
  <iframe width="100%" height="100%" srcdoc={code} src={url} bind:this={iframeRef} title={`Plugin iframe ${name}`} sandbox="allow-scripts allow-popups allow-forms allow-same-origin allow-popups-to-escape-sandbox"></iframe>
</div>
