import { describe, expect, test } from 'vitest'
import { matchSelectionToDiagram } from './matching'
import { ProofDiagError, type AvailableNode, type Diagram, type Theory, type ProofStepApplyRule } from '$lib/types/types'
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
      .toThrow(ProofDiagError)
  })

  test('Fail if selection does not even exist in the diagram', () => {
    expect(() => matchSelectionToDiagram(["myB"], [], rulesTest.diagramA, rulesTest.diagramA, rulesTest.theoryABC))
      .toThrow(ProofDiagError)
    expect(() => matchSelectionToDiagram(["myA"], [], rulesTest.diagramB, rulesTest.diagramA, rulesTest.theoryABC))
      .toThrow(ProofDiagError)
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

})
