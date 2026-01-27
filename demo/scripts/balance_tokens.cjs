const ts = require('typescript');
const fs = require('fs');

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/balance_tokens.cjs <file.tsx>');
  process.exit(2);
}

const text = fs.readFileSync(file, 'utf8');

const scanner = ts.createScanner(
  ts.ScriptTarget.Latest,
  /* skipTrivia */ false,
  ts.LanguageVariant.Standard,
  text
);

const stacks = {
  paren: [],
  brace: [],
  bracket: [],
};

function posToLC(pos) {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const lc = sf.getLineAndCharacterOfPosition(pos);
  return `${lc.line + 1}:${lc.character + 1}`;
}

let token = scanner.scan();
while (token !== ts.SyntaxKind.EndOfFileToken) {
  const start = scanner.getTokenPos();

  switch (token) {
    case ts.SyntaxKind.OpenParenToken:
      stacks.paren.push(start);
      break;
    case ts.SyntaxKind.CloseParenToken:
      stacks.paren.pop();
      break;
    case ts.SyntaxKind.OpenBraceToken:
      stacks.brace.push(start);
      break;
    case ts.SyntaxKind.CloseBraceToken:
      stacks.brace.pop();
      break;
    case ts.SyntaxKind.OpenBracketToken:
      stacks.bracket.push(start);
      break;
    case ts.SyntaxKind.CloseBracketToken:
      stacks.bracket.pop();
      break;
    default:
      break;
  }

  token = scanner.scan();
}

console.log('Unmatched opens:');
console.log('  paren:', stacks.paren.length);
console.log('  brace:', stacks.brace.length);
console.log('  bracket:', stacks.bracket.length);

const showLast = (name, arr) => {
  if (arr.length === 0) return;
  const last = arr[arr.length - 1];
  console.log(`  last ${name} at`, posToLC(last));
};

showLast('(', stacks.paren);
showLast('{', stacks.brace);
showLast('[', stacks.bracket);
