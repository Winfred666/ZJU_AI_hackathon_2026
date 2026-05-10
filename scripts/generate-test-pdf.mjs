// Generate a minimal valid PDF with multi-line text for e2e testing
import { writeFileSync } from "fs";

const lines = [
  "Chapter 1: Apple Fruit Basics",
  "Apple is a common fruit belonging to the Rosaceae family.",
  "It is rich in vitamin C and dietary fiber.",
  "Key nutrients: water, carbohydrates, fructose, glucose.",
  "Apples contain about 52 calories per 100 grams.",
  "",
  "Chapter 2: Pear Fruit Characteristics",
  "Pear also belongs to the Rosaceae family but different genus.",
  "Pears have high water content and crisp texture.",
  "Key types: White Pear, Autumn Pear, Sand Pear systems.",
  "Pears contain about 42 calories per 100 grams.",
  "",
  "Chapter 3: Apple vs Pear Comparison",
  "Both fruits belong to Rosaceae but are in different genera.",
  "Apple has malic acid giving sweet-sour taste.",
  "Pear has stone cells giving sandy-crisp texture.",
  "Hint: Build a knowledge graph connecting Apple and Pear.",
  "Include nutrients, classification, and health benefits.",
];

// Build content stream with positioned text lines
let stream = "";
lines.forEach((line, i) => {
  const y = 750 - i * 14;
  const escaped = line
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
  stream += `BT /F1 9 Tf 50 ${y} Td (${escaped}) Tj ET\n`;
});

const streamLen = Buffer.byteLength(stream, "utf8");
const fontDict = "<</F1<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>>>";
const resources = `<</Font${fontDict}>>`;

const obj3 = `3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources${resources}/Contents 4 0 R>>endobj`;
const obj4 = `4 0 obj<</Length ${streamLen}>>stream\n${stream}endstream\nendobj`;

const header = "%PDF-1.4\n";
const obj1 = "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj";
const obj2 = "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj";

const objects = [obj1, obj2, obj3, obj4];

let offset = Buffer.byteLength(header, "utf8");
const offsets = [0, offset]; // obj 0, 1

for (let i = 1; i < objects.length; i++) {
  offset += Buffer.byteLength(objects[i - 1] + "\n", "utf8");
  offsets.push(offset);
}

let pdf = header;
pdf += objects.join("\n") + "\n";

// xref
pdf += "xref\n";
pdf += `0 ${objects.length + 1}\n`;
pdf += "0000000000 65535 f \n";
for (let i = 1; i < offsets.length; i++) {
  pdf += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
}

const startxref = offset + Buffer.byteLength(objects[objects.length - 1] + "\n", "utf8");
pdf += `trailer<</Size ${objects.length + 1}/Root 1 0 R>>\n`;
pdf += `startxref\n${startxref}\n`;
pdf += "%%EOF";

import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, "..", "e2e", "fixtures", "apple-pear.pdf");
writeFileSync(outPath, pdf);
console.log(`PDF written: ${outPath} (${pdf.length} bytes)`);
