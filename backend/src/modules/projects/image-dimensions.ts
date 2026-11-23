export interface ImageDimensions {
  width: number;
  height: number;
}

function getPngDimensions(buffer: Buffer): ImageDimensions | null {
  if (
    buffer.length < 24 ||
    !buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return null;
  }

  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return width && height ? { width, height } : null;
}

function getExifOrientation(
  buffer: Buffer,
  start: number,
  end: number,
): number {
  if (
    end - start < 14 ||
    buffer.toString("ascii", start, start + 6) !== "Exif\u0000\u0000"
  ) {
    return 1;
  }

  const tiffStart = start + 6;
  const byteOrder = buffer.toString("ascii", tiffStart, tiffStart + 2);
  if (byteOrder !== "II" && byteOrder !== "MM") return 1;
  const littleEndian = byteOrder === "II";
  const canRead = (offset: number, size: number) => offset >= tiffStart && offset + size <= end;
  const readUInt16 = (offset: number) =>
    littleEndian ? buffer.readUInt16LE(offset) : buffer.readUInt16BE(offset);
  const readUInt32 = (offset: number) =>
    littleEndian ? buffer.readUInt32LE(offset) : buffer.readUInt32BE(offset);
  const ifdOffsetPosition = tiffStart + 4;
  if (!canRead(ifdOffsetPosition, 4)) return 1;

  const ifdStart = tiffStart + readUInt32(ifdOffsetPosition);
  if (!canRead(ifdStart, 2)) return 1;
  const entryCount = readUInt16(ifdStart);

  for (let index = 0; index < entryCount; index += 1) {
    const entry = ifdStart + 2 + index * 12;
    if (!canRead(entry, 12)) return 1;
    if (readUInt16(entry) !== 0x0112) continue;

    const format = readUInt16(entry + 2);
    const componentCount = readUInt32(entry + 4);
    if (format !== 3 || componentCount < 1) return 1;
    const orientation = readUInt16(entry + 8);
    return orientation >= 1 && orientation <= 8 ? orientation : 1;
  }

  return 1;
}

function getJpegDimensions(buffer: Buffer): ImageDimensions | null {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return null;
  }

  let offset = 2;
  let orientation = 1;
  const startOfFrameMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
  ]);
  const standaloneMarkers = new Set([
    0x01,
    0xd8,
    0xd9,
    ...Array.from({ length: 8 }, (_, index) => 0xd0 + index),
  ]);

  while (offset + 3 < buffer.length) {
    if (buffer[offset] !== 0xff) return null;
    while (offset < buffer.length && buffer[offset] === 0xff) offset += 1;
    if (offset >= buffer.length) return null;

    const marker = buffer[offset];
    offset += 1;
    if (marker === 0xda || marker === 0xd9) break;
    if (standaloneMarkers.has(marker)) continue;
    if (offset + 2 > buffer.length) return null;

    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > buffer.length) return null;
    const segmentStart = offset + 2;
    const segmentEnd = offset + segmentLength;

    if (marker === 0xe1) {
      const segmentOrientation = getExifOrientation(
        buffer,
        segmentStart,
        segmentEnd,
      );
      if (segmentOrientation !== 1) orientation = segmentOrientation;
    }

    if (startOfFrameMarkers.has(marker)) {
      if (segmentLength < 7) return null;
      const height = buffer.readUInt16BE(segmentStart + 1);
      const width = buffer.readUInt16BE(segmentStart + 3);
      if (!width || !height) return null;
      return orientation >= 5 && orientation <= 8
        ? { width: height, height: width }
        : { width, height };
    }

    offset = segmentEnd;
  }

  return null;
}

function readUInt24LE(buffer: Buffer, offset: number): number {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16);
}

function getWebpDimensions(buffer: Buffer): ImageDimensions | null {
  if (
    buffer.length < 30 ||
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WEBP"
  ) {
    return null;
  }

  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const chunkType = buffer.toString("ascii", offset, offset + 4);
    const chunkLength = buffer.readUInt32LE(offset + 4);
    const dataStart = offset + 8;
    const dataEnd = dataStart + chunkLength;
    if (dataEnd > buffer.length) return null;

    if (chunkType === "VP8X" && chunkLength >= 10) {
      return {
        width: readUInt24LE(buffer, dataStart + 4) + 1,
        height: readUInt24LE(buffer, dataStart + 7) + 1,
      };
    }

    if (chunkType === "VP8L" && chunkLength >= 5 && buffer[dataStart] === 0x2f) {
      const bits1 = buffer[dataStart + 1];
      const bits2 = buffer[dataStart + 2];
      const bits3 = buffer[dataStart + 3];
      const bits4 = buffer[dataStart + 4];
      return {
        width: 1 + (bits1 | ((bits2 & 0x3f) << 8)),
        height: 1 + ((bits2 >> 6) | (bits3 << 2) | ((bits4 & 0x0f) << 10)),
      };
    }

    if (
      chunkType === "VP8 " &&
      chunkLength >= 10 &&
      buffer[dataStart + 3] === 0x9d &&
      buffer[dataStart + 4] === 0x01 &&
      buffer[dataStart + 5] === 0x2a
    ) {
      return {
        width: buffer.readUInt16LE(dataStart + 6) & 0x3fff,
        height: buffer.readUInt16LE(dataStart + 8) & 0x3fff,
      };
    }

    offset = dataEnd + (chunkLength & 1);
  }

  return null;
}

export function getImageDimensions(buffer: Buffer): ImageDimensions | null {
  return (
    getPngDimensions(buffer) ??
    getJpegDimensions(buffer) ??
    getWebpDimensions(buffer)
  );
}
