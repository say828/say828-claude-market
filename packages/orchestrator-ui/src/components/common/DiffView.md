# DiffView Component

A React component for displaying code diffs with syntax highlighting and multiple view modes.

## Features

- **Unified diff view** (default) - GitHub-style unified diff
- **Split diff view** - Side-by-side comparison
- **LCS-based diff algorithm** - Produces high-quality diffs using longest common subsequence
- **Context lines** - Configurable number of unchanged lines around changes
- **Line numbers** - Shows old/new line numbers
- **Color-coded changes** - Green for additions, red for deletions
- **File headers** - Optional filename display
- **Hunk collapsing** - Shows "... lines hidden ..." between distant changes

## Usage

```tsx
import { DiffView } from './components/common';

function MyComponent() {
  const oldCode = `function hello() {
  console.log("Hello");
}`;

  const newCode = `function hello() {
  console.log("Hello, World!");
}`;

  return (
    <DiffView
      oldText={oldCode}
      newText={newCode}
      filename="src/hello.js"
      mode="unified"
      contextLines={3}
    />
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `oldText` | `string` | (required) | Original text content |
| `newText` | `string` | (required) | Modified text content |
| `filename` | `string` | `undefined` | Optional filename to display in header |
| `mode` | `'unified' \| 'split'` | `'unified'` | Diff view mode |
| `contextLines` | `number` | `3` | Number of unchanged lines to show around changes |
| `className` | `string` | `''` | Additional CSS classes for container |

## View Modes

### Unified (Default)

Shows changes inline with `+` and `-` prefixes:

```
  1   console.log('start');
- 2   console.log('old');
+ 2   console.log('new');
  3   console.log('end');
```

### Split

Shows old and new side-by-side:

```
Original              │ Modified
──────────────────────┼──────────────────────
1 console.log('old'); │ 1 console.log('new');
```

## Styling

The component uses Tailwind CSS classes with the following color scheme:

- **Container**: `bg-[#1e1e1e]` (dark background)
- **Header**: `bg-[#2d2d2d]` (slightly lighter)
- **Added lines**: `bg-green-500/20 text-green-400`
- **Deleted lines**: `bg-red-500/20 text-red-400`
- **Context lines**: `text-gray-400`
- **Line numbers**: `text-gray-600`

## Algorithm

The component uses a **Longest Common Subsequence (LCS)** algorithm to generate high-quality diffs:

1. Split both texts into lines
2. Compute LCS using dynamic programming (O(m×n) time, O(m×n) space)
3. Backtrack to identify additions, deletions, and unchanged lines
4. Group changes into hunks with configurable context
5. Collapse distant hunks with "... lines hidden ..." separators

## Integration with Claude Code Tools

Perfect for displaying changes from Claude Code's `Edit` and `Write` tools:

```tsx
// From Edit tool
<DiffView
  oldText={toolUse.input.old_string}
  newText={toolUse.input.new_string}
  filename={toolUse.input.file_path}
/>

// From Write tool (compare with previous version)
<DiffView
  oldText={previousContent}
  newText={toolUse.input.content}
  filename={toolUse.input.file_path}
/>
```

## Performance

- LCS computation: O(m×n) time and space where m, n are line counts
- Optimized for typical code files (< 10,000 lines)
- Memoized using `useMemo` to avoid recomputation on re-renders
- Handles large diffs efficiently with hunk collapsing

## Accessibility

- Line numbers use `select-none` to prevent copying
- Semantic HTML structure for better screen reader support
- High contrast colors for readability

## Examples

See `DiffView.example.tsx` for complete usage examples including:
- Simple text changes
- Multiple scattered changes
- Split view mode
- Edit tool integration
