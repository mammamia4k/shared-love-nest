export const COUPLE_EMAILS = ["mami4k@outlook.com", "mami2160p@gmail.com"];

export function isCoupleEmail(email: string | null | undefined) {
  return !!email && COUPLE_EMAILS.includes(email.trim().toLowerCase());
}

export async function resizeImage(file: File, max = 1600): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("resize"))), "image/jpeg", 0.85),
  );
}
