import { DiffView } from './DiffView';

/**
 * Example usage of DiffView component
 * This file demonstrates how to use the DiffView component with various scenarios
 */

export function DiffViewExamples() {
  // Example 1: Simple text change
  const oldText1 = `function hello() {
  console.log("Hello");
}`;

  const newText1 = `function hello() {
  console.log("Hello, World!");
}`;

  // Example 2: Multiple changes
  const oldText2 = `import React from 'react';

function Component() {
  const [count, setCount] = React.useState(0);

  return (
    <div>
      <button onClick={() => setCount(count + 1)}>
        Click me
      </button>
    </div>
  );
}

export default Component;`;

  const newText2 = `import React, { useState } from 'react';

function Component() {
  const [count, setCount] = useState(0);
  const [enabled, setEnabled] = useState(true);

  return (
    <div>
      <button
        onClick={() => setCount(count + 1)}
        disabled={!enabled}
      >
        Click me {count}
      </button>
    </div>
  );
}

export default Component;`;

  // Example 3: Edit tool change (typical Claude Code scenario)
  const oldEdit = `  const handleSubmit = () => {
    console.log('submitting');
  };`;

  const newEdit = `  const handleSubmit = async () => {
    await submitForm(formData);
  };`;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-xl font-bold mb-2 text-white">Unified Diff (Default)</h2>
        <DiffView
          oldText={oldText1}
          newText={newText1}
          filename="src/hello.js"
        />
      </div>

      <div>
        <h2 className="text-xl font-bold mb-2 text-white">Split Diff</h2>
        <DiffView
          oldText={oldText1}
          newText={newText1}
          filename="src/hello.js"
          mode="split"
        />
      </div>

      <div>
        <h2 className="text-xl font-bold mb-2 text-white">Multiple Changes</h2>
        <DiffView
          oldText={oldText2}
          newText={newText2}
          filename="src/Component.tsx"
          contextLines={2}
        />
      </div>

      <div>
        <h2 className="text-xl font-bold mb-2 text-white">Edit Tool Change</h2>
        <DiffView
          oldText={oldEdit}
          newText={newEdit}
          filename="src/form.ts"
        />
      </div>
    </div>
  );
}
