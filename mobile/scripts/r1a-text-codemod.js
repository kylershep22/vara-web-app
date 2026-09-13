/**
 * R1a codemod — point every `Text` and `TextInput` import at the shared
 * primitives. NOT SHIPPED: this file lives in scripts/ and is never bundled.
 *
 * WHY A PARSER AND NOT sed. 100 of the 297 target files write their
 * react-native import across multiple lines. A single-line regex sees 197 of
 * them and silently skips the rest, which is exactly the error R0's and R1's
 * Step 0 both made and which R1a's scope cell inherited. The TypeScript
 * compiler API is already a dependency (5.9.3); jscodeshift and ts-morph are
 * not, and neither needs adding.
 *
 * WHAT IT DOES, per file:
 *   1. Find each ImportDeclaration whose specifier is 'react-native'.
 *   2. If its named bindings include `Text` / `TextInput` (exact identifier, no
 *      alias -- Step 0 confirmed the tree contains no aliased form), drop that
 *      binding.
 *   3. If the declaration is left with no bindings at all, delete the whole
 *      statement rather than leaving `import {} from 'react-native';`.
 *      SwipeableGoalCard.tsx is the only file where this happens: it carries
 *      two react-native imports and the second is `Text` alone.
 *   4. Insert the shared import after the react-native import, with the path
 *      computed relative to the file.
 *   5. Rewrite `Animated.Text` to `AnimatedText` and add it to the shared
 *      import where used.
 *   6. JSX IS NEVER TOUCHED. All 1,906 `<Text>` sites are left exactly as they
 *      are; that is what makes the primitive's prop compatibility load-bearing.
 *
 * Usage:  node scripts/r1a-text-codemod.js --dry
 *         node scripts/r1a-text-codemod.js --apply
 */

/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const PRIMITIVE_DIR = path.join(SRC, 'components', 'shared');

const isTest = (p) => p.includes('__tests__') || /\.(test|spec)\.[tj]sx?$/.test(p);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(entry.name) && !isTest(p)) out.push(p);
  }
  return out;
}

/** Relative module path from `file` to the shared primitive module. */
function relImport(file, moduleName) {
  let rel = path.relative(path.dirname(file), path.join(PRIMITIVE_DIR, moduleName));
  rel = rel.split(path.sep).join('/');
  return rel.startsWith('.') ? rel : './' + rel;
}

function analyse(file) {
  const text = fs.readFileSync(file, 'utf8');
  // The primitives themselves must keep their react-native imports.
  if (file.startsWith(PRIMITIVE_DIR) && /[/\\](Text|TextInput)\.tsx$/.test(file)) return null;

  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const edits = [];
  let wantsText = false;
  let wantsTextInput = false;
  let wantsAnimatedText = /Animated\.Text\b/.test(text);
  let lastRNImportEnd = null;
  let emptiedDeclaration = false;

  for (const stmt of sf.statements) {
    if (!ts.isImportDeclaration(stmt)) continue;
    if (!ts.isStringLiteral(stmt.moduleSpecifier)) continue;
    if (stmt.moduleSpecifier.text !== 'react-native') continue;
    const bindings = stmt.importClause && stmt.importClause.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;

    const kept = [];
    let removedHere = false;
    for (const el of bindings.elements) {
      const name = el.name.text;
      const original = el.propertyName ? el.propertyName.text : name;
      if (!el.propertyName && original === 'Text') { wantsText = true; removedHere = true; continue; }
      if (!el.propertyName && original === 'TextInput') { wantsTextInput = true; removedHere = true; continue; }
      kept.push(el.getText(sf));
    }
    // Only rewrite a declaration this pass actually removed a binding from. A
    // file with a second react-native import that has neither name is left
    // byte-identical rather than reformatted.
    if (!removedHere) { lastRNImportEnd = stmt.end; continue; }

    if (kept.length === 0) {
      // Declaration empties: delete the whole statement, including its newline.
      let end = stmt.end;
      while (end < text.length && (text[end] === '\n' || text[end] === '\r')) end++;
      edits.push({ start: stmt.pos === 0 ? stmt.getStart(sf) : stmt.getStart(sf), end, replacement: '' });
      emptiedDeclaration = true;
    } else {
      const multiline = stmt.getText(sf).includes('\n');
      const body = multiline
        ? '{\n  ' + kept.join(',\n  ') + ',\n}'
        : '{ ' + kept.join(', ') + ' }';
      edits.push({
        start: stmt.getStart(sf),
        end: stmt.end,
        replacement: "import " + body + " from 'react-native';",
      });
    }
    lastRNImportEnd = stmt.end;
  }

  if (!wantsText && !wantsTextInput && !wantsAnimatedText) return null;
  if (wantsAnimatedText) wantsText = true;

  const added = [];
  if (wantsText) {
    added.push(
      wantsAnimatedText
        ? "import Text, { AnimatedText } from '" + relImport(file, 'Text') + "';"
        : "import Text from '" + relImport(file, 'Text') + "';"
    );
  }
  if (wantsTextInput) {
    added.push("import TextInput from '" + relImport(file, 'TextInput') + "';");
  }

  return { file, text, edits, added, lastRNImportEnd, emptiedDeclaration, wantsText, wantsTextInput, wantsAnimatedText };
}

function applyEdits(job) {
  let out = job.text;
  // Apply replacements back-to-front so offsets stay valid.
  const sorted = [...job.edits].sort((a, b) => b.start - a.start);
  for (const e of sorted) out = out.slice(0, e.start) + e.replacement + out.slice(e.end);

  // Insert the shared imports after the (possibly rewritten) react-native
  // import block. Recompute the anchor on the edited text.
  const anchor = out.lastIndexOf("from 'react-native';");
  const insertAt = anchor === -1 ? 0 : out.indexOf('\n', anchor) + 1;
  out = out.slice(0, insertAt) + job.added.join('\n') + '\n' + out.slice(insertAt);

  if (job.wantsAnimatedText) out = out.replace(/Animated\.Text\b/g, 'AnimatedText');
  return out;
}

function main() {
  const apply = process.argv.includes('--apply');
  const files = walk(SRC);
  const jobs = files.map(analyse).filter(Boolean);

  const textFiles = jobs.filter((j) => j.wantsText && !j.wantsAnimatedText).length;
  const animFiles = jobs.filter((j) => j.wantsAnimatedText).length;
  const inputFiles = jobs.filter((j) => j.wantsTextInput).length;
  const emptied = jobs.filter((j) => j.emptiedDeclaration).map((j) => path.relative(ROOT, j.file));

  console.log('R1a codemod ' + (apply ? '[APPLY]' : '[DRY RUN]'));
  console.log('  files to change              : ' + jobs.length);
  console.log('    importing Text             : ' + (textFiles + animFiles));
  console.log('    of those, Animated.Text    : ' + animFiles);
  console.log('    importing TextInput        : ' + inputFiles);
  console.log('  declarations that EMPTY      : ' + emptied.length);
  emptied.forEach((f) => console.log('    ' + f));

  if (!apply) {
    console.log('\n  (dry run: nothing written)');
    return;
  }
  for (const job of jobs) fs.writeFileSync(job.file, applyEdits(job), 'utf8');
  console.log('\n  written: ' + jobs.length + ' files');
}

main();
