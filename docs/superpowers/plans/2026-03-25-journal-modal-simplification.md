# Journal Entry Modal Simplification

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify the mobile journal entry modal by removing hardcoded reflection prompts and replacing the single AI prompt with 3 concise clickable pill suggestions that append to the entry.

**Architecture:** Update the backend `/api/journal-prompt` system prompt to return exactly 3 short prompts (newline-separated). Add a new `getJournalPromptSuggestions` function in the mobile API layer that returns `string[]`. Update `JournalEntryModal` to remove `BRAIN_HEALTH_PROMPTS`, show an "Inspire Me" button, and render AI suggestions as tappable pills above the text input.

**Tech Stack:** React Native, TypeScript, Express.js, OpenAI GPT-4o-mini

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `backend/server.js:102-122` | Update `/api/journal-prompt` system prompt to return 3 newline-separated prompts |
| Modify | `mobile/src/services/api/ai.service.ts:51-66` | New `getJournalPromptSuggestions()` that returns `string[]` |
| Modify | `mobile/src/types/models.ts:645-647` | Add `JournalPromptRawResponse` type |
| Modify | `mobile/src/screens/JournalScreen.tsx:44-355` | Simplify `JournalEntryModal`: remove prompts, add pills UI |

---

### Task 1: Update backend to return 3 concise prompts

**Files:**
- Modify: `backend/server.js:102-122`

The current system prompt asks for a single journaling prompt. We need it to return exactly 3 short prompts, one per line.

- [ ] **Step 1: Update the journal-prompt endpoint**

In `backend/server.js`, find the `/api/journal-prompt` handler (line 102). Replace the `messages` array in the `openai.chat.completions.create` call:

Old system message (line 110):
```javascript
{ role: 'system', content: 'You are a thoughtful journaling assistant. Write in a warm, conversational tone like a supportive friend. Never use markdown formatting (no **bold**, no headers, no bullet points). Keep prompts natural and inviting.' },
```

New system message:
```javascript
{ role: 'system', content: 'You are a thoughtful journaling assistant. Return exactly 3 short journal prompts, one per line. Each prompt should be a single sentence, warm and conversational. No numbering, no bullets, no markdown. Just 3 lines of text.' },
```

Old user message (line 111):
```javascript
{ role: 'user', content: prompt || 'Give me a reflective journal prompt focused on mindfulness and gratitude.' }
```

New user message:
```javascript
{ role: 'user', content: prompt || 'Give me 3 reflective journal prompts focused on mindfulness and self-awareness.' }
```

- [ ] **Step 2: Verify backend starts without errors**

Run: `cd backend && node -c server.js` (syntax check)

- [ ] **Step 3: Commit**

```bash
git add backend/server.js
git commit -m "feat: update journal-prompt endpoint to return 3 concise prompts"
```

---

### Task 2: Add mobile API function for prompt suggestions

**Files:**
- Modify: `mobile/src/types/models.ts:645-647`
- Modify: `mobile/src/services/api/ai.service.ts:51-66`

- [ ] **Step 1: Add response type**

In `mobile/src/types/models.ts`, after the existing `AIPromptResponse` interface (line 647), add:

```typescript
export interface JournalPromptRawResponse {
  text: string;
}
```

> **Note:** The existing `AIPromptResponse` has `{ prompt: string }` but the backend actually returns `{ text: string }`. This is a pre-existing mismatch — out of scope for this task but should be fixed separately. The new type uses `text` to match the actual backend response.

- [ ] **Step 2: Add getJournalPromptSuggestions function**

In `mobile/src/services/api/ai.service.ts`, add the import for the new type and add a new function after the existing `getJournalPrompt`:

```typescript
/**
 * Get 3 AI journal prompt suggestions (returned as string array)
 */
export const getJournalPromptSuggestions = async (): Promise<string[]> => {
  try {
    // Send empty prompt to use backend default (keeps prompt text in one place)
    const response = await apiPost<JournalPromptRawResponse>('/journal-prompt', {
      prompt: '',
    }, {
      debug: __DEV__,
    });
    // Backend returns newline-separated prompts in the `text` field
    const prompts = (response.text || '')
      .split('\n')
      .map((p: string) => p.trim())
      .filter((p: string) => p.length > 0)
      .slice(0, 3);
    return prompts;
  } catch (error) {
    console.error('Error getting journal prompt suggestions:', error);
    throw error;
  }
};
```

Also add `JournalPromptRawResponse` to the import from `../../types`.

- [ ] **Step 3: Verify barrel export**

The barrel at `mobile/src/services/api/index.ts` uses `export * from './ai.service'` (wildcard re-export), so `getJournalPromptSuggestions` is automatically available. No changes needed.

- [ ] **Step 4: Commit**

```bash
git add mobile/src/types/models.ts mobile/src/services/api/ai.service.ts
git commit -m "feat: add getJournalPromptSuggestions API function"
```

---

### Task 3: Simplify JournalEntryModal

**Files:**
- Modify: `mobile/src/screens/JournalScreen.tsx:44-355`

This is the main UI task. Changes:
1. Remove `BRAIN_HEALTH_PROMPTS` constant (lines 45-52)
2. Remove `showAllPrompts` state
3. Remove `handleSelectPrompt` function
4. Replace `handleGetAIPrompt` with new suggestions flow
5. Add `aiSuggestions` state (`string[]`)
6. Remove the "Reflection Prompts" section (lines 218-243)
7. Remove the "Get AI Writing Prompt" button (lines 246-255)
8. Add "Inspire Me" button + suggestion pills above the text input

- [ ] **Step 1: Update imports**

In `JournalScreen.tsx`, add `getJournalPromptSuggestions` to the import from `../services/api`:

Find:
```typescript
import { getJournalPrompt } from '../services/api';
```

Replace with:
```typescript
import { getJournalPromptSuggestions } from '../services/api';
```

> **Note:** `getJournalPrompt` is only called in `handleGetAIPrompt` (which is also being removed in Step 4), so this import removal is safe. The `loadingPrompt` state (line 68) is kept — it's reused by the new `handleGetSuggestions` function.

- [ ] **Step 2: Remove BRAIN_HEALTH_PROMPTS constant**

Delete lines 44-52:
```typescript
// Brain health reflection prompts
const BRAIN_HEALTH_PROMPTS = [
  { text: 'What felt uncomfortable today?', pillar: 'growth', icon: 'sprout' },
  { text: 'What required sustained attention?', pillar: 'focus', icon: 'eye' },
  { text: 'What did you learn that surprised you?', pillar: 'growth', icon: 'lightbulb' },
  { text: 'What challenged you today?', pillar: 'resilience', icon: 'shield-check' },
  { text: 'Who did you connect with?', pillar: 'connection', icon: 'account-heart' },
  { text: 'What gave you energy?', pillar: 'energy', icon: 'lightning-bolt' },
];
```

- [ ] **Step 3: Update modal state**

In the `JournalEntryModal` component, replace these state declarations:

Remove:
```typescript
const [showAllPrompts, setShowAllPrompts] = useState(false);
```

Add:
```typescript
const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
```

- [ ] **Step 4: Remove handleSelectPrompt and replace handleGetAIPrompt**

Remove the `handleSelectPrompt` function (lines 87-92):
```typescript
const handleSelectPrompt = (promptText: string) => {
  const newContent = content.trim()
    ? `${content}\n\n${promptText}\n`
    : `${promptText}\n`;
  setContent(newContent);
};
```

Replace the `handleGetAIPrompt` function (lines 94-105) with:

```typescript
const handleGetSuggestions = async () => {
  setLoadingPrompt(true);
  try {
    const suggestions = await getJournalPromptSuggestions();
    setAiSuggestions(suggestions);
  } catch (error) {
    console.error('Error getting suggestions:', error);
    Alert.alert('Error', 'Failed to generate suggestions. Please try again.');
  } finally {
    setLoadingPrompt(false);
  }
};

const handleSelectSuggestion = (suggestion: string) => {
  const newContent = content.trim()
    ? `${content}\n\n${suggestion}`
    : suggestion;
  setContent(newContent);
};
```

- [ ] **Step 5: Update the modal JSX — remove prompts and old AI button, add new UI**

Remove the entire "Brain Health Reflection Prompts" section (lines 218-243) and the "AI Prompt Button" section (lines 245-255). Replace with the new "Inspire Me" button and suggestion pills. Insert the new JSX block immediately before the `{/* Content Input with Voice Button */}` comment (line 257):

```tsx
          {/* AI Suggestions */}
          <TouchableOpacity
            onPress={handleGetSuggestions}
            disabled={loadingPrompt}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: Colors.evergreenTeal,
              borderRadius: 8,
              paddingVertical: 10,
              paddingHorizontal: 16,
              marginBottom: Spacing.sm,
              opacity: loadingPrompt ? 0.5 : 1,
            }}
          >
            <Ionicons name="sparkles-outline" size={18} color={Colors.evergreenTeal} style={{marginRight: 8}} />
            <Text style={{color: Colors.evergreenTeal, fontSize: 14, fontWeight: '500'}}>
              {loadingPrompt ? 'Loading...' : 'Inspire Me'}
            </Text>
          </TouchableOpacity>

          {aiSuggestions.length > 0 && (
            <View style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: Spacing.sm,
              marginBottom: Spacing.base,
            }}>
              {aiSuggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleSelectSuggestion(suggestion)}
                  style={{
                    backgroundColor: Colors.dewSage,
                    paddingHorizontal: Spacing.base,
                    paddingVertical: Spacing.sm,
                    borderRadius: Layout.borderRadius.full,
                    borderWidth: Layout.borderWidth.thin,
                    borderColor: Colors.evergreenTeal + '40',
                  }}
                >
                  <Text style={{
                    color: Colors.evergreenTeal,
                    fontSize: Typography.fontSize.sm,
                    fontWeight: Typography.fontWeight.medium,
                  }}>
                    {suggestion}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
```

- [ ] **Step 6: Reset suggestions when modal opens**

In the `useEffect` that resets form state when `visible` changes (around line 72), add `setAiSuggestions([])` to both the editing and new-entry branches:

```typescript
useEffect(() => {
  if (visible) {
    if (editingEntry) {
      setContent(editingEntry.text || editingEntry.content || '');
      setMood(editingEntry.mood || 'okay');
      setTags(editingEntry.tags || []);
    } else {
      setContent('');
      setMood('okay');
      setTags([]);
    }
    setTagInput('');
    setLoadingPrompt(false);
    setAiSuggestions([]);
  }
}, [visible, editingEntry]);
```

- [ ] **Step 7: Clean up unused styles**

Remove these style definitions that are no longer referenced (they were only used by the removed prompts section):

- `promptsContainer`
- `promptChip`
- `promptChipText`
- `promptToggle`
- `promptToggleText`
- `aiPromptButton`

- [ ] **Step 8: Commit**

```bash
git add mobile/src/screens/JournalScreen.tsx
git commit -m "feat: simplify journal modal — remove prompts, add AI suggestion pills"
```

---

### Task 4: Verify end-to-end

**Files:**
- No changes

- [ ] **Step 1: Verify TypeScript compiles**

Run: `cd mobile && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors related to JournalScreen, ai.service, or models.

- [ ] **Step 2: Verify the mobile app loads**

Run: `cd mobile && npx expo start`
Open the journal screen, tap "+" to create new entry. Verify:
- Modal shows: Mood selector, "Inspire Me" button, text input, tags, save/cancel
- No "Reflection Prompts" section visible
- Tapping "Inspire Me" shows loading, then 3 pill suggestions appear
- Tapping a pill appends its text to the content field
- Pills remain visible after tapping
- Creating an entry works correctly

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: simplified journal entry modal with AI suggestion pills"
```
