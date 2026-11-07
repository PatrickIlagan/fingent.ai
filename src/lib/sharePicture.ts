import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { LOGO_COLORS, logoSvg, type LogoAccent } from '../components/Logo';
import { shade } from '../components/Pet';

// Turns the pet's room into a picture card for sharing. The card shows the
// pet's name, stage, streak, and points earned, never balances or amounts.

const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('Could not draw the picture.'));
  image.src = src;
});
const svgUrl = (markup: string) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(markup);
const FONT = '"Plus Jakarta Sans", system-ui, -apple-system, "Segoe UI", sans-serif';

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

export type PictureInfo = { name: string; stage: string; streak: number; lifetime: number; accent: LogoAccent };

/** A 1080×1350 picture of the room with the pet's name and progress. */
export async function roomPicture(svg: SVGSVGElement, info: PictureInfo): Promise<Blob> {
  await (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready;
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const [, , viewWidth, viewHeight] = (clone.getAttribute('viewBox') || '0 0 376 342').split(/\s+/).map(Number);
  const width = 1080; const height = 1350; const roomWidth = 1000; const roomHeight = Math.round(roomWidth * viewHeight / viewWidth);
  clone.setAttribute('width', String(roomWidth));
  clone.setAttribute('height', String(roomHeight));
  clone.removeAttribute('class');
  clone.removeAttribute('style');
  const [room, logo] = await Promise.all([loadImage(svgUrl(new XMLSerializer().serializeToString(clone))), loadImage(svgUrl(logoSvg(info.accent, { size: 128 })))]);

  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d')!;
  const [from, to] = LOGO_COLORS[info.accent] ?? LOGO_COLORS.emerald;
  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, shade(from, 0.78));
  background.addColorStop(1, shade(to, 0.84));
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  // White card with the room at the top.
  context.save();
  context.shadowColor = 'rgba(15,23,42,0.16)'; context.shadowBlur = 40; context.shadowOffsetY = 14;
  roundedRect(context, 40, 40, width - 80, height - 80, 56);
  context.fillStyle = '#ffffff';
  context.fill();
  context.restore();
  context.save();
  roundedRect(context, 40, 40, width - 80, height - 80, 56);
  context.clip();
  context.drawImage(room, 40, 40, roomWidth, roomHeight);
  context.restore();

  const textTop = 40 + roomHeight + 70;
  context.fillStyle = '#0f172a';
  context.font = `800 68px ${FONT}`;
  context.fillText(info.name, 90, textTop);
  context.fillStyle = '#475569';
  context.font = `600 34px ${FONT}`;
  const details = [info.stage, info.streak > 0 ? `${info.streak}-week saving streak` : null, `${info.lifetime.toLocaleString()} points earned`].filter(Boolean).join('  ·  ');
  context.fillText(details, 92, textTop + 56);

  context.drawImage(logo, 90, height - 190, 84, 84);
  context.fillStyle = '#0f172a';
  context.font = `800 36px ${FONT}`;
  context.fillText('FinGent · Ipon', 194, height - 140);
  context.fillStyle = '#64748b';
  context.font = `500 26px ${FONT}`;
  context.fillText('Save more, grow your pet', 196, height - 104);

  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not make the picture.')), 'image/png'));
}

const blobToBase64 = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});

/** Opens the phone's share sheet (or the browser's), falling back to saving the file. */
export async function sharePicture(blob: Blob, { title, text, filename }: { title: string; text: string; filename: string }): Promise<'shared' | 'saved' | 'cancelled'> {
  if (Capacitor.isNativePlatform()) {
    const written = await Filesystem.writeFile({ path: filename, data: await blobToBase64(blob), directory: Directory.Cache });
    try { await Share.share({ title, text, files: [written.uri], dialogTitle: title }); return 'shared'; }
    catch (error) { if (/cancel/i.test(String((error as Error)?.message))) return 'cancelled'; throw error; }
  }
  const file = new File([blob], filename, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title, text }); return 'shared'; }
    catch (error) { if ((error as Error)?.name === 'AbortError') return 'cancelled'; }
  }
  savePicture(blob, filename);
  return 'saved';
}

export function savePicture(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export const canCopyPicture = () => !Capacitor.isNativePlatform() && typeof ClipboardItem !== 'undefined' && Boolean(navigator.clipboard?.write);
export async function copyPicture(blob: Blob) {
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
}
