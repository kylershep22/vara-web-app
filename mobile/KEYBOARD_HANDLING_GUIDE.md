# Keyboard Handling Guide

This guide explains how to implement consistent keyboard behavior across the Vara mobile app.

## Overview

The app now includes utilities and components to ensure consistent keyboard management:

1. **KeyboardAccessoryToolbar component** (`src/components/KeyboardAccessoryToolbar.tsx`) - **PREFERRED**
   - Native toolbar above keyboard (iOS)
   - Most intuitive UX
2. **Keyboard utility functions** (`src/utils/keyboard.ts`)
3. **KeyboardDismissButton component** (`src/components/KeyboardDismissButton.tsx`) - Fallback for Android
4. **Standard patterns** for modals and screens with text inputs

## Quick Start

### 1. Keyboard Accessory Toolbar (RECOMMENDED)

Adds a native "Done" button directly above the keyboard:

```typescript
import { KeyboardAccessoryToolbar } from '../components';

const INPUT_ACCESSORY_VIEW_ID = 'myInputAccessory';

// Add toolbar to your component (once per screen)
<KeyboardAccessoryToolbar nativeID={INPUT_ACCESSORY_VIEW_ID} />

// Connect text inputs to the toolbar
<TextInput
  inputAccessoryViewID={INPUT_ACCESSORY_VIEW_ID}
  multiline
  placeholder="Your text here"
/>
```

**Why use this?**
- ✅ Native iOS experience
- ✅ Always visible when keyboard is open
- ✅ Doesn't take up screen space
- ✅ Most intuitive for users
- ⚠️ iOS only (Android gracefully ignores it)

### 2. Alternative: In-UI Dismiss Button (Android)

For Android or as fallback:

```typescript
import { KeyboardDismissButton } from '../components';

// Icon variant for headers
<KeyboardDismissButton variant="icon" icon="chevron-down" />
```

### 3. For Text Inputs

```typescript
import { getTextInputKeyboardProps } from '../utils';

// Multi-line input with toolbar
<TextInput
  {...getTextInputKeyboardProps(true)}
  multiline
  inputAccessoryViewID={INPUT_ACCESSORY_VIEW_ID}
/>

// Single-line input
<TextInput
  {...getTextInputKeyboardProps(false)}
  inputAccessoryViewID={INPUT_ACCESSORY_VIEW_ID}
/>
```

## Detailed Usage

### 1. Modal Forms (like Journal Entry)

Best practices for forms in modals:

```typescript
const INPUT_ACCESSORY_VIEW_ID = 'journalInputAccessory';

<>
  <Modal
    visible={visible}
    onDismiss={() => {
      Keyboard.dismiss();
      onClose();
    }}
  >
    <View style={styles.modalHeader}>
      <Text>New Journal Entry</Text>
    </View>

    <KeyboardAvoidingView {...getKeyboardAvoidingViewProps(Platform.OS)}>
      <ScrollView {...getScrollViewKeyboardProps()}>
        {/* Text inputs connected to toolbar */}
        <TextInput
          {...getTextInputKeyboardProps(true)}
          multiline
          inputAccessoryViewID={INPUT_ACCESSORY_VIEW_ID}
        />

        <Button onPress={handleSave}>Save</Button>
      </ScrollView>
    </KeyboardAvoidingView>
  </Modal>

  {/* Keyboard toolbar - renders above keyboard */}
  <KeyboardAccessoryToolbar nativeID={INPUT_ACCESSORY_VIEW_ID} />
</>
```

**Why this works:**
- ✅ "Done" button appears ON the keyboard (iOS)
- ✅ Always accessible, never hidden by content
- ✅ Native iOS behavior users expect
- ✅ Clean UI - no extra buttons cluttering the screen

### 2. Full Screen Forms

For screens with forms (not in modals):

```typescript
<SafeAreaView style={{ flex: 1 }}>
  <KeyboardAvoidingView {...getKeyboardAvoidingViewProps(Platform.OS)}>
    <ScrollView {...getScrollViewKeyboardProps()}>
      {/* Form content */}
    </ScrollView>
  </KeyboardAvoidingView>
</SafeAreaView>
```

### 3. Search Bars

For search inputs that should dismiss on submit:

```typescript
<TextInput
  {...getTextInputKeyboardProps(false)}
  placeholder="Search..."
  onChangeText={setSearchQuery}
  onSubmitEditing={() => {
    handleSearch();
    Keyboard.dismiss();
  }}
/>
```

### 4. Comment/Reply Inputs

For inline text inputs:

```typescript
<View style={styles.commentInput}>
  <TextInput
    {...getTextInputKeyboardProps(false)}
    placeholder="Add a comment..."
    onSubmitEditing={() => {
      handleSubmit();
      Keyboard.dismiss();
    }}
  />
  <IconButton
    icon="send"
    onPress={() => {
      handleSubmit();
      Keyboard.dismiss();
    }}
  />
</View>
```

## Props Reference

### getTextInputKeyboardProps(multiline: boolean)

Returns appropriate props for TextInput components:

**For single-line (`multiline: false`):**
- `blurOnSubmit: true` - Dismisses keyboard on enter
- `returnKeyType: 'done'` - Shows "Done" button

**For multi-line (`multiline: true`):**
- `blurOnSubmit: false` - Allows new lines with enter
- `returnKeyType: 'default'` - Shows return button

### getScrollViewKeyboardProps()

Returns props for ScrollView to handle keyboard properly:
- `keyboardShouldPersistTaps: 'handled'` - Allows taps on buttons when keyboard is open
- `keyboardDismissMode: 'on-drag'` - Dismisses keyboard when scrolling

### getKeyboardAvoidingViewProps(platform)

Returns platform-specific props for KeyboardAvoidingView:
- **iOS:** `behavior: 'padding'`, `keyboardVerticalOffset: 64`
- **Android:** `behavior: 'height'`, `keyboardVerticalOffset: 0`

### KeyboardAccessoryToolbar Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `nativeID` | `string` | **required** | Unique ID to connect text inputs |
| `onDone` | `() => void` | `undefined` | Custom action before dismissing |
| `doneLabel` | `string` | `'Done'` | Label for done button |
| `showDone` | `boolean` | `true` | Show/hide done button |
| `children` | `ReactNode` | `undefined` | Custom left-side content |

### KeyboardDismissButton Props (Legacy/Android)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'text' \| 'contained' \| 'icon'` | `'contained'` | Button style |
| `label` | `string` | `'Done typing'` | Button text |
| `icon` | `IconName` | `'checkmark-circle'` | Icon to display |
| `style` | `ViewStyle` | `undefined` | Custom styles |

## Common Patterns

### Pattern 1: Large Text Area with Keyboard Toolbar

```typescript
const INPUT_ACCESSORY_VIEW_ID = 'textInputAccessory';

<>
  <ScrollView {...getScrollViewKeyboardProps()}>
    <Text>What's on your mind?</Text>
    <TextInput
      {...getTextInputKeyboardProps(true)}
      multiline
      numberOfLines={10}
      style={styles.largeInput}
      inputAccessoryViewID={INPUT_ACCESSORY_VIEW_ID}
    />
  </ScrollView>

  {/* Toolbar appears above keyboard */}
  <KeyboardAccessoryToolbar nativeID={INPUT_ACCESSORY_VIEW_ID} />
</>
```

**Why?** Toolbar is always visible above keyboard, regardless of text length. No UI clutter!

### Pattern 2: Form with Multiple Inputs

```typescript
const INPUT_ACCESSORY_VIEW_ID = 'formInputAccessory';

<>
  <ScrollView {...getScrollViewKeyboardProps()}>
    <TextInput
      {...getTextInputKeyboardProps(false)}
      placeholder="Name"
      inputAccessoryViewID={INPUT_ACCESSORY_VIEW_ID}
    />
    <TextInput
      {...getTextInputKeyboardProps(false)}
      placeholder="Email"
      inputAccessoryViewID={INPUT_ACCESSORY_VIEW_ID}
    />
    <TextInput
      {...getTextInputKeyboardProps(true)}
      multiline
      placeholder="Bio"
      inputAccessoryViewID={INPUT_ACCESSORY_VIEW_ID}
    />
    <Button onPress={handleSave}>Save</Button>
  </ScrollView>

  <KeyboardAccessoryToolbar nativeID={INPUT_ACCESSORY_VIEW_ID} />
</>
```

## Testing Checklist

When implementing keyboard handling, test:

- [ ] **iOS:** "Done" button appears in toolbar above keyboard
- [ ] **iOS:** Tapping "Done" dismisses keyboard
- [ ] Keyboard appears when tapping text input
- [ ] Keyboard re-appears when tapping back into input
- [ ] Can scroll to see all form fields when keyboard is open
- [ ] Can reach submit/save buttons when keyboard is open
- [ ] Keyboard dismisses when submitting single-line inputs
- [ ] Enter key creates new line in multiline inputs
- [ ] Keyboard dismisses when closing modal/screen
- [ ] Buttons are tappable when keyboard is visible (keyboardShouldPersistTaps)
- [ ] **Android:** App works normally (ignores InputAccessoryView)

## Example: Complete Form Implementation

See `mobile/src/screens/JournalScreen.tsx` for a complete example of proper keyboard handling in a modal form with:
- KeyboardAccessoryToolbar (native iOS toolbar above keyboard)
- KeyboardAvoidingView
- ScrollView with keyboard props
- Multiple text inputs connected to the same toolbar
- Proper TextInput configuration

## Troubleshooting

### Problem: Toolbar doesn't appear above keyboard
**Solution:**
1. Check that `inputAccessoryViewID` on TextInput matches the `nativeID` on KeyboardAccessoryToolbar
2. Ensure KeyboardAccessoryToolbar is rendered (check it's not inside a conditional that's false)
3. Remember: iOS only - Android ignores this feature

### Problem: Buttons hidden behind keyboard
**Solution:** Use KeyboardAccessoryToolbar OR ensure ScrollView has `keyboardShouldPersistTaps="handled"`

### Problem: Can't scroll to bottom when keyboard is open
**Solution:** Add `keyboardVerticalOffset` to KeyboardAvoidingView

### Problem: Keyboard doesn't dismiss on submit
**Solution:** Add `Keyboard.dismiss()` to submit handlers OR use KeyboardAccessoryToolbar

### Problem: Enter key dismisses multiline input
**Solution:** Use `getTextInputKeyboardProps(true)` for multiline inputs

### Problem: Toolbar doesn't work on Android
**Solution:** This is expected - InputAccessoryView is iOS-only. Consider adding a header dismiss button for Android or rely on back button.

## Future Enhancements

Consider adding:
1. Animated keyboard dismiss transitions
2. Keyboard height tracking for dynamic layouts
3. Auto-scroll to focused input
4. Custom keyboard toolbar (iOS)
5. Keyboard shortcut support (tablets)
