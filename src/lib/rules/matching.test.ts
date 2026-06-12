import { describe, expect, test } from 'vitest'
import { matchSelectionToDiagram } from './matching'
import { ProofDiagError, type AvailableNode, type Diagram, type Theory, type ProofStepApplyRule } from '$lib/types/types'
// Nice syntax to update nested objects in an immutable way via
// const myobj2 = editCopy(myobj, draft => {draft.foo.bar.baz = 5})
import { editCopy } from '$lib/utils'

const diagramA = {
  nodes: {
    myA: {
      nodeKind: "A"
    },
  },
} satisfies Diagram

const diagramAA = {
  nodes: {
    myA: {
      nodeKind: "A"
    },
    myA2: {
      nodeKind: "A"
    },
  },
} satisfies Diagram

const diagramB = {
  nodes: {
    myB: {
      nodeKind: "B"
    },
  },
} satisfies Diagram


// Describe = group tests by (sub)-category
describe('Test matching selection to diagram', () => {
  test('Trivial match exactly same trivial graph', () => {
    expect(matchSelectionToDiagram(["myA"], [], diagramA, diagramA)).toEqual({
      nodeBijectionAB: {myA: "myA"},
      boundaryAnchorsBA: {},
      linkBijectionAB: {},
    })
  })
  test('Trivial match different diagram', () => {
    expect(() => matchSelectionToDiagram(["myA"], [], diagramA, diagramB)).toThrow(ProofDiagError)
  })
  test('Fail if selection does not even exist in the diagram', () => {
    expect(() => matchSelectionToDiagram(["myB"], [], diagramA, diagramA)).toThrow(ProofDiagError)
    expect(() => matchSelectionToDiagram(["myA"], [], diagramB, diagramA)).toThrow(ProofDiagError)
  })
})
