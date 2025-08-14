import type { Canvas as FabricCanvas } from 'fabric';

export function getCanvasHTMLElement(canvas: FabricCanvas): HTMLCanvasElement {
  const anyCanvas = canvas as any;
  // Prefer selection canvas (upper) → then upper → then lower
  if (typeof anyCanvas.getSelectionElement === 'function') {
    return anyCanvas.getSelectionElement() as HTMLCanvasElement;
  }
  return (anyCanvas.upperCanvasEl || anyCanvas.lowerCanvasEl) as HTMLCanvasElement;
}