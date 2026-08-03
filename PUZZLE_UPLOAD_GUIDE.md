# Puzzle Upload Guide

This guide explains how to create and upload puzzles to the Vara app.

---

## Directory Structure

Create a `puzzles/` folder in the project root:

```
wellness-app/
├── puzzles/
│   ├── 2025-11-13.json
│   ├── 2025-11-14.json
│   ├── 2025-11-15.json
│   └── ...
├── scripts/
│   └── upload-puzzles.js
└── ...
```

---

## Puzzle File Format

Each JSON file should contain an array of puzzles for that day:

**Example: `puzzles/2025-11-13.json`**

```json
[
  {
    "id": "2025-11-13-sudoku-easy",
    "type": "sudoku",
    "difficulty": "easy",
    "date": "2025-11-13",
    "data": {
      "grid": [
        [5, 3, 0, 0, 7, 0, 0, 0, 0],
        [6, 0, 0, 1, 9, 5, 0, 0, 0],
        [0, 9, 8, 0, 0, 0, 0, 6, 0],
        [8, 0, 0, 0, 6, 0, 0, 0, 3],
        [4, 0, 0, 8, 0, 3, 0, 0, 1],
        [7, 0, 0, 0, 2, 0, 0, 0, 6],
        [0, 6, 0, 0, 0, 0, 2, 8, 0],
        [0, 0, 0, 4, 1, 9, 0, 0, 5],
        [0, 0, 0, 0, 8, 0, 0, 7, 9]
      ]
    },
    "solution": {
      "grid": [
        [5, 3, 4, 6, 7, 8, 9, 1, 2],
        [6, 7, 2, 1, 9, 5, 3, 4, 8],
        [1, 9, 8, 3, 4, 2, 5, 6, 7],
        [8, 5, 9, 7, 6, 1, 4, 2, 3],
        [4, 2, 6, 8, 5, 3, 7, 9, 1],
        [7, 1, 3, 9, 2, 4, 8, 5, 6],
        [9, 6, 1, 5, 3, 7, 2, 8, 4],
        [2, 8, 7, 4, 1, 9, 6, 3, 5],
        [3, 4, 5, 2, 8, 6, 1, 7, 9]
      ]
    },
    "hints": [
      { "row": 0, "col": 2, "value": 4 },
      { "row": 1, "col": 1, "value": 7 },
      { "row": 2, "col": 0, "value": 1 }
    ],
    "createdAt": "2025-11-13T00:00:00Z"
  },
  {
    "id": "2025-11-13-pattern-medium",
    "type": "pattern",
    "difficulty": "medium",
    "date": "2025-11-13",
    "data": {
      "sequence": [2, 4, 8, 16, 32],
      "questionIndex": 5,
      "options": [64, 48, 56, 72]
    },
    "solution": {
      "answer": 64,
      "explanation": "Powers of 2: multiply by 2 each time"
    },
    "createdAt": "2025-11-13T00:00:00Z"
  },
  {
    "id": "2025-11-13-memory-easy",
    "type": "memory",
    "difficulty": "easy",
    "date": "2025-11-13",
    "data": {
      "gridSize": "4x4",
      "cards": [
        { "id": 1, "image": "brain.svg", "pair": 2 },
        { "id": 2, "image": "brain.svg", "pair": 1 },
        { "id": 3, "image": "heart.svg", "pair": 4 },
        { "id": 4, "image": "heart.svg", "pair": 3 },
        { "id": 5, "image": "star.svg", "pair": 6 },
        { "id": 6, "image": "star.svg", "pair": 5 },
        { "id": 7, "image": "moon.svg", "pair": 8 },
        { "id": 8, "image": "moon.svg", "pair": 7 },
        { "id": 9, "image": "sun.svg", "pair": 10 },
        { "id": 10, "image": "sun.svg", "pair": 9 },
        { "id": 11, "image": "leaf.svg", "pair": 12 },
        { "id": 12, "image": "leaf.svg", "pair": 11 },
        { "id": 13, "image": "water.svg", "pair": 14 },
        { "id": 14, "image": "water.svg", "pair": 13 },
        { "id": 15, "image": "fire.svg", "pair": 16 },
        { "id": 16, "image": "fire.svg", "pair": 15 }
      ],
      "maxTime": 120
    },
    "solution": {
      "optimalMoves": 16
    },
    "createdAt": "2025-11-13T00:00:00Z"
  },
  {
    "id": "2025-11-13-logic-hard",
    "type": "logic",
    "difficulty": "hard",
    "date": "2025-11-13",
    "data": {
      "question": "If all Bloops are Razzies and all Razzies are Lazzies, are all Bloops definitely Lazzies?",
      "options": ["Yes", "No", "Cannot determine"],
      "context": "Use logical reasoning to determine the relationship."
    },
    "solution": {
      "answer": "Yes",
      "explanation": "Transitive property: If A→B and B→C, then A→C. Therefore, Bloops→Razzies→Lazzies means Bloops→Lazzies."
    },
    "createdAt": "2025-11-13T00:00:00Z"
  },
  {
    "id": "2025-11-13-word-easy",
    "type": "word",
    "difficulty": "easy",
    "date": "2025-11-13",
    "data": {
      "gameType": "anagram",
      "scrambled": "NIARB",
      "hint": "The organ responsible for thinking",
      "category": "health"
    },
    "solution": {
      "answer": "BRAIN",
      "alternates": []
    },
    "createdAt": "2025-11-13T00:00:00Z"
  }
]
```

---

## Puzzle Type Specifications

### 1. Sudoku
- **Grid:** 9x9 array, `0` represents empty cells
- **Solution:** Complete 9x9 array with all values filled
- **Hints:** Array of pre-calculated hints (row, col, value)
- **Difficulty:**
  - Easy: 40-45 pre-filled cells
  - Medium: 30-35 pre-filled cells
  - Hard: 25-30 pre-filled cells

### 2. Pattern Recognition
- **Sequence:** Array of numbers showing the pattern
- **QuestionIndex:** Index where the answer should go (usually last)
- **Options:** Array of 4 possible answers
- **Solution:** Correct answer and explanation
- **Examples:**
  - Math sequences: 2, 4, 8, 16, 32, ?
  - Fibonacci: 1, 1, 2, 3, 5, 8, ?
  - Alternating: 1, 4, 2, 5, 3, 6, ?

### 3. Memory Game
- **GridSize:** "4x4", "4x6", or "6x6"
- **Cards:** Array of card objects with ID, image, and pair ID
- **MaxTime:** Time limit in seconds (optional)
- **Images:** Reference to SVG icons in `public/icons/puzzle/`
- **Difficulty:**
  - Easy: 4x4 (8 pairs)
  - Medium: 4x6 (12 pairs)
  - Hard: 6x6 (18 pairs)

### 4. Logic Puzzle
- **Question:** The logic problem statement
- **Options:** Array of possible answers (2-4 options)
- **Context:** Additional information or clues
- **Solution:** Correct answer and explanation
- **Types:**
  - Deductive reasoning
  - Syllogisms
  - Truth tables
  - Pattern logic

### 5. Word Game
- **GameType:** "anagram", "wordsearch", or "cryptogram"
- **Scrambled:** The scrambled word/phrase
- **Hint:** Clue to help solve
- **Category:** Topic category (health, science, nature, etc.)
- **Solution:** Answer and possible alternates
- **Difficulty:**
  - Easy: 4-6 letter words
  - Medium: 7-9 letter words
  - Hard: 10+ letter words or phrases

---

## Image Assets for Memory Game

Place puzzle images in: `public/icons/puzzle/`

**Required icons:**
- brain.svg
- heart.svg
- star.svg
- moon.svg
- sun.svg
- leaf.svg
- water.svg
- fire.svg
- tree.svg
- mountain.svg
- flower.svg
- cloud.svg
- lightning.svg
- snowflake.svg
- rainbow.svg
- wave.svg

**Create more as needed for variety**

---

## Upload Process

### Prerequisites

1. Install Firebase Admin SDK:
```bash
npm install firebase-admin --save-dev
```

2. Get Firebase service account key:
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - **Save it OUTSIDE this repo** (for example `~/.secrets/vara-admin.json`).
     Never save a key inside the repo, even a gitignored one.
   - Point the Admin SDK at it:
     ```bash
     export GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/vara-admin.json
     ```
     The scripts use Application Default Credentials and read this variable.

### Upload Command

```bash
node scripts/upload-puzzles.js puzzles/2025-11-13.json
```

### Batch Upload (multiple days)

```bash
# Upload all puzzle files in puzzles/ folder
for file in puzzles/*.json; do
  node scripts/upload-puzzles.js "$file"
done
```

---

## Validation Checklist

Before uploading, verify:

- [ ] All puzzle IDs follow format: `{date}-{type}-{difficulty}`
- [ ] Dates are in ISO format: `YYYY-MM-DD`
- [ ] Each day has 3-5 puzzles (variety of types)
- [ ] Difficulty is balanced (not all hard, not all easy)
- [ ] Solutions are correct
- [ ] Sudoku grids are valid (solvable, unique solution)
- [ ] Memory game cards have matching pairs
- [ ] Pattern explanations are clear
- [ ] Word game answers match scrambled letters
- [ ] JSON is valid (use JSONLint.com to check)

---

## Daily Puzzle Recommendations

**Ideal daily set (5 puzzles):**
1. **Sudoku** (Easy or Medium) - Classic puzzle, 10-15 min
2. **Pattern Recognition** (Medium) - Quick thinking, 2-3 min
3. **Memory Game** (Easy or Medium) - Visual memory, 3-5 min
4. **Logic Puzzle** (Medium or Hard) - Deep thinking, 5-10 min
5. **Word Game** (Easy or Medium) - Vocabulary, 2-5 min

**Total time:** ~25-40 minutes if user does all puzzles

**User can choose:** Which puzzle(s) to do each day

---

## Generating Puzzles

### Tools & Resources

**Sudoku:**
- Generator: https://qqwing.com/generate.html
- Python library: `py-sudoku`
- API: https://sudoku-api.vercel.app/

**Pattern Recognition:**
- Create manually based on math sequences
- Tool: https://www.mathsisfun.com/numbers/sequences-series.html

**Memory Game:**
- Random pair generation (script can help)
- Use themed sets (nature, brain health, wellness)

**Logic Puzzles:**
- Curate from logic puzzle books
- Create custom based on brain health themes

**Word Games:**
- Anagram generator: https://wordsmith.org/anagram/
- Use brain health vocabulary (cognitive, neural, etc.)

---

## Troubleshooting

### Upload fails with "Permission denied"
- Check `firestore.rules` has admin write access
- Verify service account key is correct
- Ensure Firebase project ID matches

### Puzzle doesn't appear in app
- Check date format is correct
- Verify puzzle ID is unique
- Ensure createdAt timestamp is valid
- Check Firestore console to confirm upload

### Invalid JSON error
- Validate JSON at https://jsonlint.com/
- Check for trailing commas
- Ensure quotes are correct (double quotes only)
- Verify array/object structure

---

## Example: Creating 30 Days of Puzzles

**Workflow:**

1. **Week 1:** Create 7 days of puzzles (Nov 13-19)
   - 5 puzzles per day × 7 days = 35 puzzles total
   - Mix difficulties and types

2. **Test:** Upload and test in app
   - Verify all puzzles load correctly
   - Test each puzzle type plays correctly
   - Check solutions validate properly

3. **Week 2:** Create next 7 days (Nov 20-26)
   - Continue pattern
   - Increase difficulty gradually

4. **Repeat:** Until 30 days complete

**Time estimate:** ~2-3 hours per day's worth of puzzles

---

## Future Enhancements

- **Auto-generation:** Script to generate certain puzzle types
- **Difficulty progression:** Gradually increase difficulty over weeks
- **Themed weeks:** Focus on specific cognitive skills
- **User-submitted puzzles:** Community contributions
- **Puzzle editor UI:** Web interface for creating puzzles

---

**For questions, refer to BRAIN_HEALTH_REDESIGN.md or contact dev team**
