import { describe, expect, test } from 'vitest'
import { matchSelectionToDiagram } from './matching'
import { VeryyDiagError, type AvailableNode, type Diagram, type Theory, type ProofStepApplyRule } from '$lib/types/types'
import * as rulesTest from './rules.test'

// Nice syntax to update nested objects in an immutable way via
// const myobj2 = editCopy(myobj, draft => {draft.foo.bar.baz = 5})
import { editCopy } from '$lib/utils'


// Describe = group tests by (sub)-category
describe('Test matching selection to diagram', () => {
  test('Trivial match exactly same trivial graph', () => {
    expect(matchSelectionToDiagram(["myA"], [], rulesTest.diagramA, rulesTest.diagramA, rulesTest.theoryA))
      .toEqual({
        nodeBijectionAB: {myA: "myA"},
        boundaryAnchorsBA: {},
        linkBijectionAB: {},
      })
  })

  test('Trivial match same trivial graph, renamed', () => {
    expect(matchSelectionToDiagram(["myAprime"], [], rulesTest.diagramAprime, rulesTest.diagramA, rulesTest.theoryABC))
      .toEqual({
        nodeBijectionAB: {myAprime: "myA"},
        boundaryAnchorsBA: {},
        linkBijectionAB: {},
      })
  })

  test('Trivial match subgraph', () => {
    expect(matchSelectionToDiagram(["myA"], [], rulesTest.diagramAB, rulesTest.diagramA, rulesTest.theoryABC))
      .toEqual({
        nodeBijectionAB: {myA: "myA"},
        boundaryAnchorsBA: {},
        linkBijectionAB: {},
      })
  })

  test('Matching fails if trivially different diagram ', () => {
    expect(() => matchSelectionToDiagram(["myA"], [], rulesTest.diagramA, rulesTest.diagramB, rulesTest.theoryABC))
      .toThrow(VeryyDiagError)
  })

  test('Fail if selection does not even exist in the diagram', () => {
    expect(() => matchSelectionToDiagram(["myB"], [], rulesTest.diagramA, rulesTest.diagramA, rulesTest.theoryABC))
      .toThrow(VeryyDiagError)
    expect(() => matchSelectionToDiagram(["myA"], [], rulesTest.diagramB, rulesTest.diagramA, rulesTest.theoryABC))
      .toThrow(VeryyDiagError)
  })

  // Test links

  test('Simple graph with one link, same diagram', () => {
    expect(matchSelectionToDiagram(["myA", "myC"], [ "foo" ], rulesTest.diagramAtoC, rulesTest.diagramAtoC, rulesTest.theoryABC))
      .toEqual({
        nodeBijectionAB: {myA: "myA", myC: "myC"},
        boundaryAnchorsBA: {},
        linkBijectionAB: {foo: "foo"},
      })
  })

  test('Simple graph with one link, renamed diagram', () => {
    expect(matchSelectionToDiagram(["myA", "myC"], [ "foo" ], rulesTest.diagramAtoC, rulesTest.diagramAprimetoCprime, rulesTest.theoryABC))
      .toEqual({
        nodeBijectionAB: {myA: "myAprime", myC: "myCprime"},
        boundaryAnchorsBA: {},
        linkBijectionAB: {foo: "fooPrime"},
      })
  })

  test('Simple graph with one mono-wire link', () => {
    expect(matchSelectionToDiagram(["myA"], [ "foo" ], rulesTest.diagramAtoC, rulesTest.diagramAtoAlice, rulesTest.theoryABC))
      .toEqual({
        nodeBijectionAB: {myA: "myA"},
        boundaryAnchorsBA: {"aliceBoundary.boundary": "myC.in"},
        linkBijectionAB: {foo: "foo"},
      })
  })

  test('Simple graph with one mono-wire link, renamed', () => {
    expect(matchSelectionToDiagram(["myA"], [ "foo" ], rulesTest.diagramAtoC, rulesTest.diagramAprimetoAlice, rulesTest.theoryABC))
      .toEqual({
        nodeBijectionAB: {myA: "myAprime"},
        boundaryAnchorsBA: {"aliceBoundary.boundary": "myC.in"},
        linkBijectionAB: {foo: "fooPrime"},
      })
  })

  test('Simple graph with one mono-wire link, link in different direction', () => {
    expect(matchSelectionToDiagram(["myA"], [ "foo" ], editCopy(rulesTest.diagramAtoC, (draft) => {
      draft.linksWithID.foo = {...draft.linksWithID.foo, from: draft.linksWithID.foo.to, to: draft.linksWithID.foo.from}
    }), rulesTest.diagramAtoAlice, rulesTest.theoryABC))
      .toEqual({
        nodeBijectionAB: {myA: "myA"},
        boundaryAnchorsBA: {"aliceBoundary.boundary": "myC.in"},
        linkBijectionAB: {foo: "foo"},
      })

    // Same but renamed
    expect(matchSelectionToDiagram(["myA"], [ "foo" ], editCopy(rulesTest.diagramAtoC, (draft) => {
      draft.linksWithID.foo = {...draft.linksWithID.foo, from: draft.linksWithID.foo.to, to: draft.linksWithID.foo.from}
    }), rulesTest.diagramAprimetoAlice, rulesTest.theoryABC))
      .toEqual({
        nodeBijectionAB: {myA: "myAprime"},
        boundaryAnchorsBA: {"aliceBoundary.boundary": "myC.in"},
        linkBijectionAB: {foo: "fooPrime"},
      })


    // Same, but inverse direction in the rule
    expect(matchSelectionToDiagram(["myA"],
                                   [ "foo" ],
                                   rulesTest.diagramAtoC,
                                   editCopy(rulesTest.diagramAtoAlice,
                                            (draft) => {
                                              draft.linksWithID.foo = {
                                                ...draft.linksWithID.foo,
                                                from: draft.linksWithID.foo.to,
                                                to: draft.linksWithID.foo.from
                                              }
                                            }
                                   ),
                                   rulesTest.theoryABC))
      .toEqual({
        nodeBijectionAB: {myA: "myA"},
        boundaryAnchorsBA: {"aliceBoundary.boundary": "myC.in"},
        linkBijectionAB: {foo: "foo"},
      })
  })

  test('Fails if an extra link is present', () => {
    expect(() => matchSelectionToDiagram(["myA"], [ "foo" ], editCopy(rulesTest.diagramAtoC, (draft: any) => {
      draft.linksWithID.Ishouldnotbehere = draft.linksWithID.foo
    }), rulesTest.diagramAprimetoAlice, rulesTest.theoryABC))
      .toThrow(VeryyDiagError)
  })


})
