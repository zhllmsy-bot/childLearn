function leftRotate(value: number, bits: number) {
  return ((value << bits) | (value >>> (32 - bits))) >>> 0;
}

function sha1Hex(input: string) {
  const bytes = Array.from(new TextEncoder().encode(input));
  const bitLength = bytes.length * 8;

  bytes.push(0x80);
  while (bytes.length % 64 !== 56) {
    bytes.push(0);
  }

  const high = Math.floor(bitLength / 2 ** 32);
  const low = bitLength >>> 0;
  [high, low].forEach((part) => {
    bytes.push((part >>> 24) & 0xff);
    bytes.push((part >>> 16) & 0xff);
    bytes.push((part >>> 8) & 0xff);
    bytes.push(part & 0xff);
  });

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;

  for (let offset = 0; offset < bytes.length; offset += 64) {
    const words = new Array<number>(80).fill(0);

    for (let index = 0; index < 16; index += 1) {
      const wordOffset = offset + index * 4;
      words[index] =
        ((bytes[wordOffset] << 24) |
          (bytes[wordOffset + 1] << 16) |
          (bytes[wordOffset + 2] << 8) |
          bytes[wordOffset + 3]) >>>
        0;
    }

    for (let index = 16; index < 80; index += 1) {
      words[index] = leftRotate(
        words[index - 3] ^
          words[index - 8] ^
          words[index - 14] ^
          words[index - 16],
        1,
      );
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;

    for (let index = 0; index < 80; index += 1) {
      let f: number;
      let k: number;

      if (index < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (index < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (index < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }

      const temp = (leftRotate(a, 5) + f + e + k + words[index]) >>> 0;
      e = d;
      d = c;
      c = leftRotate(b, 30);
      b = a;
      a = temp;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }

  return [h0, h1, h2, h3, h4]
    .map((word) => word.toString(16).padStart(8, '0'))
    .join('');
}

export function normalizeStem(stem: string) {
  return stem
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/？/g, '?')
    .replace(/[，。、“”"'`]/g, '')
    .replace(/\d+/g, '#');
}

export function fingerprintStem(stem: string) {
  return sha1Hex(normalizeStem(stem)).slice(0, 10);
}

export function buildRecentFingerprints(
  stems: Array<string | null | undefined>,
  limit = 30,
) {
  return stems
    .map((stem) => (typeof stem === 'string' ? stem.trim() : ''))
    .filter(Boolean)
    .slice(-limit)
    .map((stem) => fingerprintStem(stem));
}
