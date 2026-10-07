// Turns a mono-wire boundary name to the final anchor in D. Note that it's not enough to use simply
// boundaryAnchorsBA to get a node in A because the node itself may be part of the rewritting diagram.
// In this case, things are fancy : this is well defined only in two cases :
// - if the corresponding anchor in C accepts arbitrary links, i.e. is a multi-boundary
// - if the corresponding anchor in C accepts a mono-wire boundary … (here things gets a bit mind blowing) … and if this mono-anchor is
// the same wire as the one of the first mono-wire boundary. This basically means that both ends of the same wire are on two
// mono-wire boundaries. But it has many fancy implications, like:
// 1. One can remove all nodes in a graph with this kind of rule (actually used in ZX): start with a ZX spider with one loop.
// The ID rule tells you that you can remove the node… hence you get a graph with one link looping on itself but you are
// left with no node in the graph!! (which is for now not something we can represent in our notation). One may be able to get
// around this issue by forbidding this case and defining instead a special node with an axiom/definition saying that this node
// is a equal to self loop on an arbitrary spider…
// 2. Using this same example, we can realize that when we want to map the ZX with one loop to the rule, we don't know how to do
// the mapping in linkBijectionAB: since it's a dict diagram -> rule, a link can map to a single element… But things also break
// down on more simple examples that don't produce empty diagrams, for instance if we consider the ZX rule --X-- == --Z--
// and apply it on a looping X, we should get a looping Z. Yet this is not possible to apply it with the current syntax.
// Possible solutions:
// 1. One solution could be to say "we force all mono-wire boundary nodes to be DIFFERENT anchors".
// Advantage :
// - it makes reasoning easier (possibly also when proving statements in Rocq/Lean)
// - we can emulate the case where boundaries are equal by adding more rules
// Issues :
// - the zx ID rule would not apply when connected to a spider like Z = X (= means double link). I REALLY DON'T LIKE THAT.
// 2. Solution 2: just say that every link must be different (avoid empty-graph-with-loop issue, can still write extra rules
// to specify that links are allowed to be shared), but allow anchors to be equal. Then two sub-solutions :
// i) Either we allow the other end of the link to point back to another link in the rule (needs a multi-wire boundary
// or we wouldn't be able to connect it without having two single-wire boundary links mapping to the same diagram node).
// Advantage: slightly more general (but can't find much usecase… if you have some let
// me know I can maybe change this later). But still, I think we can emulate this by
// creating a new node that just "cuts" a wire in two parts with a rule to merge it back
// into a single node.
// Issue: more complex + can lead to "undefined behavior" if the multi-wire part of the
// rule says "remove all wires" and the other end mono-wire part says "keep the wire".
// ii) say that each anchor must be different and not present in the graph. Seems like
// simpler to think, reason, and I think we can always add rules/nodes to recover
// other behaviors as explained above.
// For cases where we want to mean "exactly N links irrespective of where they are going", this is
// actually closer to multi-wire boundary semantic, on which we allow an extra condition to fail if
// the number of connected wires is not the good one… I see mono-wire boundary link rather as a way
// to change boundary links (add/remove links) like in the ZX ID rule which would not be possible to
// write with multi-wire since we don't allow multiple connections between them, or precisely when
// we care about where it is comming, like a "A minus A = 0" rule. And it's soo much simpler to
// implement since otherwise we lose the bijection between wires.
// Summary: one mono-wire boundary = one DIFFERENT link, but possibly the same anchor whose node is
// DIFFERENT than the other present nodes.
