export function downloadSvgById(svgId: string, filename: string): void {
  const svgEl = document.getElementById(svgId);
  if (!svgEl) return;
  const serializer = new XMLSerializer();
  let source = serializer.serializeToString(svgEl);
  if (!source.includes('xmlns="http://www.w3.org/2000/svg"')) {
    source = source.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Rasterizes an on-page SVG figure into a crisp high-DPI PNG data URL
 * for embedding into the editable ISO A0 PowerPoint (.pptx) export.
 */
export async function svgElementToPngDataUrl(
  svgId: string,
  scale = 4
): Promise<{ dataUrl: string; width: number; height: number } | null> {
  const svgEl = document.getElementById(svgId);
  if (!svgEl || !(svgEl instanceof SVGSVGElement)) return null;

  const viewBox = svgEl.viewBox.baseVal;
  const vbWidth = viewBox && viewBox.width > 0 ? viewBox.width : svgEl.clientWidth || 460;
  const vbHeight = viewBox && viewBox.height > 0 ? viewBox.height : svgEl.clientHeight || 240;

  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(vbWidth));
  clone.setAttribute('height', String(vbHeight));
  clone.setAttribute('viewBox', `0 0 ${vbWidth} ${vbHeight}`);

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clone);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const blobUrl = URL.createObjectURL(svgBlob);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Could not rasterize SVG #${svgId}`));
      image.src = blobUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(vbWidth * scale);
    canvas.height = Math.round(vbHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, vbWidth, vbHeight);

    return {
      dataUrl: canvas.toDataURL('image/png'),
      width: vbWidth,
      height: vbHeight,
    };
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}
