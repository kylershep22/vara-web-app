/**
 * Puzzle Upload Script
 *
 * Uploads puzzle JSON files to Firestore
 *
 * Usage: node scripts/upload-puzzles.js puzzles/2025-11-13.json
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('../backend/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

/**
 * Upload puzzles from a JSON file
 * @param {string} filePath - Path to the puzzle JSON file
 */
async function uploadPuzzles(filePath) {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      process.exit(1);
    }

    // Read and parse JSON
    const fileContent = fs.readFileSync(filePath, 'utf8');
    let puzzles;

    try {
      puzzles = JSON.parse(fileContent);
    } catch (error) {
      console.error(`❌ Invalid JSON in ${filePath}:`, error.message);
      process.exit(1);
    }

    // Validate puzzles array
    if (!Array.isArray(puzzles)) {
      console.error(`❌ File must contain an array of puzzles`);
      process.exit(1);
    }

    if (puzzles.length === 0) {
      console.warn(`⚠️  No puzzles found in ${filePath}`);
      process.exit(0);
    }

    console.log(`📦 Found ${puzzles.length} puzzle(s) in ${path.basename(filePath)}`);

    // Validate each puzzle
    const errors = [];
    puzzles.forEach((puzzle, index) => {
      const validation = validatePuzzle(puzzle, index);
      if (validation.errors.length > 0) {
        errors.push(...validation.errors);
      }
    });

    if (errors.length > 0) {
      console.error(`\n❌ Validation errors found:\n`);
      errors.forEach(err => console.error(`  - ${err}`));
      process.exit(1);
    }

    console.log(`✅ All puzzles validated successfully\n`);

    // Upload to Firestore (batch write)
    const batch = db.batch();

    puzzles.forEach(puzzle => {
      const ref = db.collection('puzzles').doc(puzzle.id);
      batch.set(ref, {
        ...puzzle,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    await batch.commit();

    console.log(`✅ Successfully uploaded ${puzzles.length} puzzle(s) to Firestore\n`);

    // Print summary
    const summary = puzzles.reduce((acc, puzzle) => {
      acc[puzzle.type] = (acc[puzzle.type] || 0) + 1;
      return acc;
    }, {});

    console.log(`📊 Summary:`);
    Object.entries(summary).forEach(([type, count]) => {
      console.log(`  - ${type}: ${count}`);
    });

    process.exit(0);

  } catch (error) {
    console.error(`❌ Upload failed:`, error.message);
    process.exit(1);
  }
}

/**
 * Validate a puzzle object
 * @param {Object} puzzle - Puzzle object to validate
 * @param {number} index - Index in the array (for error messages)
 * @returns {Object} Validation result with errors array
 */
function validatePuzzle(puzzle, index) {
  const errors = [];
  const prefix = `Puzzle ${index + 1}`;

  // Required fields
  if (!puzzle.id) errors.push(`${prefix}: Missing 'id' field`);
  if (!puzzle.type) errors.push(`${prefix}: Missing 'type' field`);
  if (!puzzle.difficulty) errors.push(`${prefix}: Missing 'difficulty' field`);
  if (!puzzle.date) errors.push(`${prefix}: Missing 'date' field`);
  if (!puzzle.data) errors.push(`${prefix}: Missing 'data' field`);
  if (!puzzle.solution) errors.push(`${prefix}: Missing 'solution' field`);

  // Validate type
  const validTypes = ['sudoku', 'pattern', 'memory', 'logic', 'word'];
  if (puzzle.type && !validTypes.includes(puzzle.type)) {
    errors.push(`${prefix}: Invalid type '${puzzle.type}'. Must be one of: ${validTypes.join(', ')}`);
  }

  // Validate difficulty
  const validDifficulties = ['easy', 'medium', 'hard'];
  if (puzzle.difficulty && !validDifficulties.includes(puzzle.difficulty)) {
    errors.push(`${prefix}: Invalid difficulty '${puzzle.difficulty}'. Must be one of: ${validDifficulties.join(', ')}`);
  }

  // Validate ID format
  if (puzzle.id && !/^\d{4}-\d{2}-\d{2}-\w+-\w+$/.test(puzzle.id)) {
    errors.push(`${prefix}: ID must follow format YYYY-MM-DD-type-difficulty (e.g., 2025-11-13-sudoku-easy)`);
  }

  // Validate date format
  if (puzzle.date && !/^\d{4}-\d{2}-\d{2}$/.test(puzzle.date)) {
    errors.push(`${prefix}: Date must be in YYYY-MM-DD format`);
  }

  // Type-specific validation
  if (puzzle.type === 'sudoku') {
    validateSudoku(puzzle, prefix, errors);
  } else if (puzzle.type === 'pattern') {
    validatePattern(puzzle, prefix, errors);
  } else if (puzzle.type === 'memory') {
    validateMemory(puzzle, prefix, errors);
  } else if (puzzle.type === 'logic') {
    validateLogic(puzzle, prefix, errors);
  } else if (puzzle.type === 'word') {
    validateWord(puzzle, prefix, errors);
  }

  return { errors };
}

function validateSudoku(puzzle, prefix, errors) {
  if (!puzzle.data.grid || !Array.isArray(puzzle.data.grid) || puzzle.data.grid.length !== 9) {
    errors.push(`${prefix}: Sudoku must have a 9x9 grid array`);
  }
  if (!puzzle.solution.grid || !Array.isArray(puzzle.solution.grid) || puzzle.solution.grid.length !== 9) {
    errors.push(`${prefix}: Sudoku solution must have a 9x9 grid array`);
  }
}

function validatePattern(puzzle, prefix, errors) {
  if (!puzzle.data.sequence || !Array.isArray(puzzle.data.sequence)) {
    errors.push(`${prefix}: Pattern must have a sequence array`);
  }
  if (!puzzle.data.options || !Array.isArray(puzzle.data.options)) {
    errors.push(`${prefix}: Pattern must have an options array`);
  }
  if (!puzzle.solution.answer) {
    errors.push(`${prefix}: Pattern must have a solution answer`);
  }
}

function validateMemory(puzzle, prefix, errors) {
  if (!puzzle.data.cards || !Array.isArray(puzzle.data.cards)) {
    errors.push(`${prefix}: Memory game must have a cards array`);
  }
  if (!puzzle.data.gridSize) {
    errors.push(`${prefix}: Memory game must have a gridSize`);
  }

  // Check pairs match
  if (puzzle.data.cards) {
    const pairMap = new Map();
    puzzle.data.cards.forEach(card => {
      if (!pairMap.has(card.image)) {
        pairMap.set(card.image, 0);
      }
      pairMap.set(card.image, pairMap.get(card.image) + 1);
    });

    for (const [image, count] of pairMap.entries()) {
      if (count !== 2) {
        errors.push(`${prefix}: Image '${image}' must appear exactly twice (found ${count})`);
      }
    }
  }
}

function validateLogic(puzzle, prefix, errors) {
  if (!puzzle.data.question) {
    errors.push(`${prefix}: Logic puzzle must have a question`);
  }
  if (!puzzle.data.options || !Array.isArray(puzzle.data.options)) {
    errors.push(`${prefix}: Logic puzzle must have an options array`);
  }
  if (!puzzle.solution.answer) {
    errors.push(`${prefix}: Logic puzzle must have a solution answer`);
  }
}

function validateWord(puzzle, prefix, errors) {
  if (!puzzle.data.scrambled) {
    errors.push(`${prefix}: Word game must have scrambled text`);
  }
  if (!puzzle.solution.answer) {
    errors.push(`${prefix}: Word game must have a solution answer`);
  }
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
📝 Puzzle Upload Script

Usage: node scripts/upload-puzzles.js <file-path>

Examples:
  node scripts/upload-puzzles.js puzzles/2025-11-13.json
  node scripts/upload-puzzles.js puzzles/*.json

Required:
  - serviceAccountKey.json in project root
  - Valid puzzle JSON file(s)

For format details, see PUZZLE_UPLOAD_GUIDE.md
    `);
    process.exit(0);
  }

  uploadPuzzles(args[0]);
}

module.exports = { uploadPuzzles, validatePuzzle };
