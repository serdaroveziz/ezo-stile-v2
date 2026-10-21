/* Repairs valid UTF-8 byte sequences that were decoded as Windows-1254. */
const fs = require('node:fs');

const decoder1254 = new TextDecoder('windows-1254');
const reverse = new Map();
for (let byte = 0; byte <= 255; byte++) {
  reverse.set(decoder1254.decode(Uint8Array.of(byte)), byte);
}

function repair(text) {
  const chars = Array.from(text);
  let result = '';
  for (let index = 0; index < chars.length;) {
    const first = reverse.get(chars[index]);
    let width = 0;
    if (first >= 0xc2 && first <= 0xdf) width = 2;
    else if (first >= 0xe0 && first <= 0xef) width = 3;
    else if (first >= 0xf0 && first <= 0xf4) width = 4;

    if (width && index + width <= chars.length) {
      const bytes = chars.slice(index, index + width).map(char => reverse.get(char));
      const valid = bytes.every((byte, offset) =>
        offset === 0 || (byte !== undefined && byte >= 0x80 && byte <= 0xbf));
      if (valid) {
        result += Buffer.from(bytes).toString('utf8');
        index += width;
        continue;
      }
    }
    result += chars[index];
    index++;
  }
  return result;
}

for (const file of process.argv.slice(2)) {
  const original = fs.readFileSync(file, 'utf8');
  const repaired = repair(original);
  if (repaired !== original) {
    fs.writeFileSync(file, repaired, 'utf8');
    console.log(`repaired: ${file}`);
  }
}
