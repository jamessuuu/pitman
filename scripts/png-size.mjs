// Read the real pixel dimensions out of a PNG's IHDR chunk. The in-page
// scrollWidth can read a clean 390 while the rendered full-page PNG is 437px
// wide (an ambient gradient bleeding past the viewport) — only the file's own
// header settles it.
export function PNG_SIZE(buf) {
  // PNG signature is 8 bytes, then a 4-byte length + "IHDR" + width + height.
  if (buf.length < 24) throw new Error("not a PNG (too short)");
  const sig = buf.subarray(0, 8).toString("hex");
  if (sig !== "89504e470d0a1a0a") throw new Error("not a PNG (bad signature)");
  const type = buf.subarray(12, 16).toString("ascii");
  if (type !== "IHDR") throw new Error(`expected IHDR, got ${type}`);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}
