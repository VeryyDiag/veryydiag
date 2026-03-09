// This file contains generic utils functions

// getTransformToElement(fromElement, toElement) returns the matrix to apply to turn coordinate in the insideElement coordinate
// system into coordinates in outsideElement.
// This function was deprecated in SVG but practical, let's re-implement it with
// non-deprecated functions
// https://stackoverflow.com/questions/5891552/more-usage-of-gettransformtoelement
export function getTransformToElement(fromElement: SVGGraphicsElement, toElement: SVGGraphicsElement) : DOMMatrix | undefined {
  const m = fromElement.getScreenCTM()
  // This may be undefined, e.g. elements are not attached to the DOM
  if (m === null)
    return undefined
  else
    return toElement.getScreenCTM()?.inverse()?.multiply(m)
}

// SVG uses CSS px as the base units, and 1cm = 96px / 2.54. We prefer to assume that each small node fits inside a 1cm x 1cm box
// so we use cm as units here
export function cmToUnit(cm: number) {
  return cm * 96 / 2.54
}

// practical alias
export function cm(cm: number) {
  return cmToUnit(cm)
}

export function unitToCm(cm: number) {
  return cm * 96 / 2.54
}

