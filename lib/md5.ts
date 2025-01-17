// Web-compatible MD5 implementation
export function md5(str: string): string {
  function rotateLeft(value: number, shift: number): number {
    return (value << shift) | (value >>> (32 - shift));
  }

  function toHexString(value: number): string {
    const hexChars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += hexChars[(value >> (i * 8 + 4)) & 0xf] + hexChars[(value >> (i * 8)) & 0xf];
    }
    return result;
  }

  let x = Array(80);
  let k, AA, BB, CC, DD, a, b, c, d;
  let x_ = Array(16);
  let S11 = 7, S12 = 12, S13 = 17, S14 = 22;
  let S21 = 5, S22 = 9, S23 = 14, S24 = 20;
  let S31 = 4, S32 = 11, S33 = 16, S34 = 23;
  let S41 = 6, S42 = 10, S43 = 15, S44 = 21;

  str = unescape(encodeURIComponent(str));
  let length = str.length;

  let words = Array(((length + 8) >> 6) + 1);
  for (k = 0; k < words.length; k++) words[k] = 0;
  for (k = 0; k < length; k++) words[k >> 2] |= str.charCodeAt(k) << ((k % 4) * 8);
  words[k >> 2] |= 0x80 << ((k % 4) * 8);
  words[words.length - 2] = length * 8;

  a = 0x67452301;
  b = 0xefcdab89;
  c = 0x98badcfe;
  d = 0x10325476;

  for (k = 0; k < words.length; k += 16) {
    AA = a;
    BB = b;
    CC = c;
    DD = d;

    a = rotateLeft((a + ((b & c) | (~b & d)) + words[k + 0] + 0xd76aa478), S11) + b;
    d = rotateLeft((d + ((a & b) | (~a & c)) + words[k + 1] + 0xe8c7b756), S12) + a;
    c = rotateLeft((c + ((d & a) | (~d & b)) + words[k + 2] + 0x242070db), S13) + d;
    b = rotateLeft((b + ((c & d) | (~c & a)) + words[k + 3] + 0xc1bdceee), S14) + c;

    a = rotateLeft((a + ((b & c) | (~b & d)) + words[k + 4] + 0xf57c0faf), S11) + b;
    d = rotateLeft((d + ((a & b) | (~a & c)) + words[k + 5] + 0x4787c62a), S12) + a;
    c = rotateLeft((c + ((d & a) | (~d & b)) + words[k + 6] + 0xa8304613), S13) + d;
    b = rotateLeft((b + ((c & d) | (~c & a)) + words[k + 7] + 0xfd469501), S14) + c;

    a = rotateLeft((a + ((b & c) | (~b & d)) + words[k + 8] + 0x698098d8), S11) + b;
    d = rotateLeft((d + ((a & b) | (~a & c)) + words[k + 9] + 0x8b44f7af), S12) + a;
    c = rotateLeft((c + ((d & a) | (~d & b)) + words[k + 10] + 0xffff5bb1), S13) + d;
    b = rotateLeft((b + ((c & d) | (~c & a)) + words[k + 11] + 0x895cd7be), S14) + c;

    a = rotateLeft((a + ((b & c) | (~b & d)) + words[k + 12] + 0x6b901122), S11) + b;
    d = rotateLeft((d + ((a & b) | (~a & c)) + words[k + 13] + 0xfd987193), S12) + a;
    c = rotateLeft((c + ((d & a) | (~d & b)) + words[k + 14] + 0xa679438e), S13) + d;
    b = rotateLeft((b + ((c & d) | (~c & a)) + words[k + 15] + 0x49b40821), S14) + c;

    a = rotateLeft((a + ((b & d) | (c & ~d)) + words[k + 1] + 0xf61e2562), S21) + b;
    d = rotateLeft((d + ((a & c) | (b & ~c)) + words[k + 6] + 0xc040b340), S22) + a;
    c = rotateLeft((c + ((d & b) | (a & ~b)) + words[k + 11] + 0x265e5a51), S23) + d;
    b = rotateLeft((b + ((c & a) | (d & ~a)) + words[k + 0] + 0xe9b6c7aa), S24) + c;

    a = rotateLeft((a + ((b & d) | (c & ~d)) + words[k + 5] + 0xd62f105d), S21) + b;
    d = rotateLeft((d + ((a & c) | (b & ~c)) + words[k + 10] + 0x02441453), S22) + a;
    c = rotateLeft((c + ((d & b) | (a & ~b)) + words[k + 15] + 0xd8a1e681), S23) + d;
    b = rotateLeft((b + ((c & a) | (d & ~a)) + words[k + 4] + 0xe7d3fbc8), S24) + c;

    a = rotateLeft((a + ((b & d) | (c & ~d)) + words[k + 9] + 0x21e1cde6), S21) + b;
    d = rotateLeft((d + ((a & c) | (b & ~c)) + words[k + 14] + 0xc33707d6), S22) + a;
    c = rotateLeft((c + ((d & b) | (a & ~b)) + words[k + 3] + 0xf4d50d87), S23) + d;
    b = rotateLeft((b + ((c & a) | (d & ~a)) + words[k + 8] + 0x455a14ed), S24) + c;

    a = rotateLeft((a + ((b & d) | (c & ~d)) + words[k + 13] + 0xa9e3e905), S21) + b;
    d = rotateLeft((d + ((a & c) | (b & ~c)) + words[k + 2] + 0xfcefa3f8), S22) + a;
    c = rotateLeft((c + ((d & b) | (a & ~b)) + words[k + 7] + 0x676f02d9), S23) + d;
    b = rotateLeft((b + ((c & a) | (d & ~a)) + words[k + 12] + 0x8d2a4c8a), S24) + c;

    a = rotateLeft((a + (b ^ c ^ d) + words[k + 5] + 0xfffa3942), S31) + b;
    d = rotateLeft((d + (a ^ b ^ c) + words[k + 8] + 0x8771f681), S32) + a;
    c = rotateLeft((c + (d ^ a ^ b) + words[k + 11] + 0x6d9d6122), S33) + d;
    b = rotateLeft((b + (c ^ d ^ a) + words[k + 14] + 0xfde5380c), S34) + c;

    a = rotateLeft((a + (b ^ c ^ d) + words[k + 1] + 0xa4beea44), S31) + b;
    d = rotateLeft((d + (a ^ b ^ c) + words[k + 4] + 0x4bdecfa9), S32) + a;
    c = rotateLeft((c + (d ^ a ^ b) + words[k + 7] + 0xf6bb4b60), S33) + d;
    b = rotateLeft((b + (c ^ d ^ a) + words[k + 10] + 0xbebfbc70), S34) + c;

    a = rotateLeft((a + (b ^ c ^ d) + words[k + 13] + 0x289b7ec6), S31) + b;
    d = rotateLeft((d + (a ^ b ^ c) + words[k + 0] + 0xeaa127fa), S32) + a;
    c = rotateLeft((c + (d ^ a ^ b) + words[k + 3] + 0xd4ef3085), S33) + d;
    b = rotateLeft((b + (c ^ d ^ a) + words[k + 6] + 0x04881d05), S34) + c;

    a = rotateLeft((a + (b ^ c ^ d) + words[k + 9] + 0xd9d4d039), S31) + b;
    d = rotateLeft((d + (a ^ b ^ c) + words[k + 12] + 0xe6db99e5), S32) + a;
    c = rotateLeft((c + (d ^ a ^ b) + words[k + 15] + 0x1fa27cf8), S33) + d;
    b = rotateLeft((b + (c ^ d ^ a) + words[k + 2] + 0xc4ac5665), S34) + c;

    a = rotateLeft((a + ((b | ~c) ^ d) + words[k + 0] + 0xf4292244), S41) + b;
    d = rotateLeft((d + ((a | ~b) ^ c) + words[k + 7] + 0x432aff97), S42) + a;
    c = rotateLeft((c + ((d | ~a) ^ b) + words[k + 14] + 0xab9423a7), S43) + d;
    b = rotateLeft((b + ((c | ~d) ^ a) + words[k + 5] + 0xfc93a039), S44) + c;

    a = rotateLeft((a + ((b | ~c) ^ d) + words[k + 12] + 0x655b59c3), S41) + b;
    d = rotateLeft((d + ((a | ~b) ^ c) + words[k + 3] + 0x8f0ccc92), S42) + a;
    c = rotateLeft((c + ((d | ~a) ^ b) + words[k + 10] + 0xffeff47d), S43) + d;
    b = rotateLeft((b + ((c | ~d) ^ a) + words[k + 1] + 0x85845dd1), S44) + c;

    a = rotateLeft((a + ((b | ~c) ^ d) + words[k + 8] + 0x6fa87e4f), S41) + b;
    d = rotateLeft((d + ((a | ~b) ^ c) + words[k + 15] + 0xfe2ce6e0), S42) + a;
    c = rotateLeft((c + ((d | ~a) ^ b) + words[k + 6] + 0xa3014314), S43) + d;
    b = rotateLeft((b + ((c | ~d) ^ a) + words[k + 13] + 0x4e0811a1), S44) + c;

    a = rotateLeft((a + ((b | ~c) ^ d) + words[k + 4] + 0xf7537e82), S41) + b;
    d = rotateLeft((d + ((a | ~b) ^ c) + words[k + 11] + 0xbd3af235), S42) + a;
    c = rotateLeft((c + ((d | ~a) ^ b) + words[k + 2] + 0x2ad7d2bb), S43) + d;
    b = rotateLeft((b + ((c | ~d) ^ a) + words[k + 9] + 0xeb86d391), S44) + c;

    a = (a + AA) >>> 0;
    b = (b + BB) >>> 0;
    c = (c + CC) >>> 0;
    d = (d + DD) >>> 0;
  }

  return toHexString(a) + toHexString(b) + toHexString(c) + toHexString(d);
} 