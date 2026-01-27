const ts = require('typescript');
const fs = require('fs');

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/ts_parse_diag.cjs <path-to-ts/tsx-file>');
  process.exit(2);
}

const text = fs.readFileSync(file, 'utf8');
const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

const diags = sf.parseDiagnostics || [];
console.log('parseDiagnostics', diags.length);
for (const d of diags.slice(0, 50)) {
  const pos = d.start ?? 0;
  const lc = sf.getLineAndCharacterOfPosition(pos);
  const msg = ts.flattenDiagnosticMessageText(d.messageText, ' ');
  console.log(`${lc.line + 1}:${lc.character + 1}`, msg);
}
