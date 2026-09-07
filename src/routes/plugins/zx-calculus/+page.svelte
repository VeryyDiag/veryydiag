<script lang="ts">
  import {onMount} from 'svelte'
  let n = $state(0)
  onMount(async () => {
    console.log("Installing pyodide…")
    // @ts-ignore Loaded from the <script>, not installed via npm (reduce dependencies since this is just a plugin)
    let pyodide = await loadPyodide();
    console.log("Running my first python: 1 + 2 = ", pyodide.runPython("1 + 2"))
    console.log("Loading micropip…")
    await pyodide.loadPackage("micropip");
    const micropip = pyodide.pyimport("micropip");
    console.log("Installing pyzx…")
    await micropip.install('pyzx');
    console.log("Pyzx installed!")
    const code = String.raw`
import pyzx as zx
import numpy as np
# Create an empty graph
g = zx.Graph()

# --- Step 1: Inputs/outputs ---
# Input qubit (to be teleported)
inp = g.add_vertex(ty=zx.VertexType.BOUNDARY)
g.set_inputs([inp])

# Output qubit (target)
out = g.add_vertex(ty=zx.VertexType.BOUNDARY)
g.set_outputs([out])

# --- Step 2: Bell pair (entanglement resource) ---
# Two Z-spiders connected (|00> + |11>)
z1 = g.add_vertex(ty=zx.VertexType.Z)
z2 = g.add_vertex(ty=zx.VertexType.Z)

g.add_edge((z1, z2))

# --- Step 3: Bell measurement (interaction with input) ---
# Connect input to Bell pair via X-spider (like CX/H combo)
x_meas = g.add_vertex(ty=zx.VertexType.X)

g.add_edge((inp, x_meas))
g.add_edge((x_meas, z1))

# --- Step 4: Connect second Bell qubit to output ---
g.add_edge((z2, out))

# --- Step 5: Optional phases (simulate corrections structure) ---
# In full teleportation you'd include phase gadgets (π corrections),
# but here we keep it minimal.

print("Initial ZX-graph:")
print(g)

# --- Step 6: Simplify (this is where teleportation magic appears) ---
#zx.simplify.full_reduce(g)

#print("\nReduced ZX-graph:")
#print(g)

# --- Step 7: Extract matrix ---
mat = g.to_matrix()

print("\nResulting matrix:")
print(mat)
[mat.real, mat.imag]
    `
    console.log("Code to run", code)
    const mat = pyodide.runPython(code)
    console.log("Result", mat)
    console.log("mat",mat.toJs({create_pyproxies: false}))
  })
</script>
<svelte:head>
  <base target="_blank">
  <!-- We could install it via npm, let's maybe save bundle size since it is a plugin? TODO: see if use via npm. -->
  <script src="https://cdn.jsdelivr.net/pyodide/v314.0.6/full/pyodide.js"></script>
</svelte:head>

<div class="mytext">
  <p>This plugin allows you to treat a diagram as a ZX-calculus diagram, and to use tools originating from <a href="https://pyzx.readthedocs.io/" rel="noopener noreferrer">PyZX</a>.</p>
  <button onclick={() => n = n + 1}>Click me {n}</button>
  <p>Work in progress</p>
</div>
