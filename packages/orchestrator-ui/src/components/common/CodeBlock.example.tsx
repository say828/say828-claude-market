/**
 * CodeBlock Component Usage Examples
 *
 * This file demonstrates various usage patterns for the CodeBlock component.
 */

import { CodeBlock } from './CodeBlock';

export function CodeBlockExamples() {
  // Example 1: Python code with filename (auto-detects language)
  const pythonCode = `def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

# Calculate first 10 Fibonacci numbers
for i in range(10):
    print(f"F({i}) = {fibonacci(i)}")`;

  // Example 2: JavaScript with explicit language
  const javascriptCode = `async function fetchData(url) {
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
}`;

  // Example 3: TypeScript with type annotations
  const typescriptCode = `interface User {
  id: number;
  name: string;
  email: string;
}

function greetUser(user: User): string {
  return \`Hello, \${user.name}!\`;
}`;

  // Example 4: JSON configuration
  const jsonCode = `{
  "name": "claude-orchestrator",
  "version": "0.1.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "react": "^18.2.0",
    "shiki": "^1.0.0"
  }
}`;

  // Example 5: Bash script
  const bashCode = `#!/bin/bash

# Install dependencies
bun install

# Run build
bun run build

echo "Build completed successfully!"`;

  // Example 6: Long code that will be collapsed
  const longCode = Array(100)
    .fill(0)
    .map((_, i) => `console.log("Line ${i + 1}");`)
    .join('\n');

  return (
    <div className="space-y-6 p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">CodeBlock Examples</h1>

      {/* Example 1: Auto-detect from filename */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-2">1. Auto-detect language from filename</h2>
        <CodeBlock code={pythonCode} filename="fibonacci.py" />
      </div>

      {/* Example 2: Explicit language */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-2">2. Explicit language specification</h2>
        <CodeBlock code={javascriptCode} language="javascript" filename="fetchData.js" />
      </div>

      {/* Example 3: TypeScript */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-2">3. TypeScript with type annotations</h2>
        <CodeBlock code={typescriptCode} filename="user.ts" />
      </div>

      {/* Example 4: JSON */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-2">4. JSON configuration</h2>
        <CodeBlock code={jsonCode} filename="package.json" />
      </div>

      {/* Example 5: Bash script */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-2">5. Bash script</h2>
        <CodeBlock code={bashCode} filename="build.sh" />
      </div>

      {/* Example 6: No line numbers */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-2">6. Without line numbers</h2>
        <CodeBlock code={javascriptCode} language="javascript" showLineNumbers={false} />
      </div>

      {/* Example 7: No filename header */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-2">7. No filename header</h2>
        <CodeBlock code={typescriptCode} language="typescript" />
      </div>

      {/* Example 8: Collapsed (long code) */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-2">
          8. Long code (collapses after 50 lines by default)
        </h2>
        <CodeBlock code={longCode} language="javascript" filename="long-file.js" />
      </div>

      {/* Example 9: Custom max lines */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-2">9. Custom collapse threshold (10 lines)</h2>
        <CodeBlock
          code={longCode}
          language="javascript"
          filename="custom-max.js"
          maxLines={10}
        />
      </div>

      {/* Example 10: Custom className */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-2">10. Custom className (border)</h2>
        <CodeBlock
          code={pythonCode}
          filename="fibonacci.py"
          className="border-2 border-blue-500"
        />
      </div>
    </div>
  );
}

/**
 * Usage in your components:
 *
 * import { CodeBlock } from './components/common';
 *
 * <CodeBlock
 *   code={yourCode}
 *   filename="example.ts"  // Optional: used for header and language detection
 *   language="typescript"   // Optional: explicit language (overrides auto-detection)
 *   showLineNumbers={true}  // Optional: default is true
 *   maxLines={50}          // Optional: collapse threshold, default is 50
 *   className="my-custom"  // Optional: additional CSS classes
 * />
 */
