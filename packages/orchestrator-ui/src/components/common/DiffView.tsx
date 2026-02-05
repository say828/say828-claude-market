import { useMemo } from 'react';

interface DiffViewProps {
  oldText: string;
  newText: string;
  filename?: string;
  mode?: 'unified' | 'split';
  contextLines?: number;
  className?: string;
}

type DiffLine = {
  type: 'add' | 'delete' | 'context';
  content: string;
  oldLineNum?: number;
  newLineNum?: number;
};

type DiffHunk = {
  lines: DiffLine[];
  oldStart: number;
  newStart: number;
};

/**
 * Compute the longest common subsequence (LCS) for better diff quality
 */
function computeLCS(oldLines: string[], newLines: string[]): number[][] {
  const m = oldLines.length;
  const n = newLines.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  return dp;
}

/**
 * Generate diff using LCS algorithm
 */
function generateDiff(oldText: string, newText: string, contextLines: number): DiffHunk[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');

  const dp = computeLCS(oldLines, newLines);
  const diffLines: DiffLine[] = [];

  // Backtrack to find the diff
  let i = oldLines.length;
  let j = newLines.length;
  const changes: Array<{ type: 'add' | 'delete' | 'context'; oldIdx?: number; newIdx?: number }> = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      changes.unshift({ type: 'context', oldIdx: i - 1, newIdx: j - 1 });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      changes.unshift({ type: 'add', newIdx: j - 1 });
      j--;
    } else if (i > 0) {
      changes.unshift({ type: 'delete', oldIdx: i - 1 });
      i--;
    }
  }

  // Convert to DiffLine with line numbers
  let oldLineNum = 1;
  let newLineNum = 1;

  for (const change of changes) {
    if (change.type === 'context') {
      diffLines.push({
        type: 'context',
        content: oldLines[change.oldIdx!],
        oldLineNum: oldLineNum++,
        newLineNum: newLineNum++,
      });
    } else if (change.type === 'delete') {
      diffLines.push({
        type: 'delete',
        content: oldLines[change.oldIdx!],
        oldLineNum: oldLineNum++,
      });
    } else if (change.type === 'add') {
      diffLines.push({
        type: 'add',
        content: newLines[change.newIdx!],
        newLineNum: newLineNum++,
      });
    }
  }

  // Group into hunks with context
  const hunks: DiffHunk[] = [];
  let currentHunk: DiffLine[] = [];
  let hunkOldStart = 1;
  let hunkNewStart = 1;
  let contextCount = 0;

  for (let idx = 0; idx < diffLines.length; idx++) {
    const line = diffLines[idx];

    if (line.type !== 'context') {
      // Start new hunk or add to current
      if (currentHunk.length === 0) {
        // Include context before the change
        const startIdx = Math.max(0, idx - contextLines);
        for (let k = startIdx; k < idx; k++) {
          currentHunk.push(diffLines[k]);
        }
        hunkOldStart = diffLines[startIdx]?.oldLineNum || 1;
        hunkNewStart = diffLines[startIdx]?.newLineNum || 1;
      }
      currentHunk.push(line);
      contextCount = 0;
    } else if (currentHunk.length > 0) {
      // Add context after change
      currentHunk.push(line);
      contextCount++;

      // Check if we should close the hunk
      if (contextCount >= contextLines) {
        // Look ahead to see if there are more changes nearby
        let hasMoreChanges = false;
        for (let k = idx + 1; k < Math.min(idx + contextLines + 1, diffLines.length); k++) {
          if (diffLines[k].type !== 'context') {
            hasMoreChanges = true;
            break;
          }
        }

        if (!hasMoreChanges) {
          // Close the hunk
          hunks.push({
            lines: currentHunk,
            oldStart: hunkOldStart,
            newStart: hunkNewStart,
          });
          currentHunk = [];
          contextCount = 0;
        }
      }
    }
  }

  // Add remaining hunk
  if (currentHunk.length > 0) {
    hunks.push({
      lines: currentHunk,
      oldStart: hunkOldStart,
      newStart: hunkNewStart,
    });
  }

  return hunks;
}

export function DiffView({
  oldText,
  newText,
  filename,
  mode = 'unified',
  contextLines = 3,
  className = '',
}: DiffViewProps) {
  const hunks = useMemo(
    () => generateDiff(oldText, newText, contextLines),
    [oldText, newText, contextLines]
  );

  if (mode === 'split') {
    return <SplitDiffView hunks={hunks} filename={filename} className={className} />;
  }

  return <UnifiedDiffView hunks={hunks} filename={filename} className={className} />;
}

function UnifiedDiffView({
  hunks,
  filename,
  className,
}: {
  hunks: DiffHunk[];
  filename?: string;
  className?: string;
}) {
  return (
    <div className={`bg-[#1e1e1e] rounded-lg overflow-hidden font-mono text-sm ${className}`}>
      {filename && (
        <div className="bg-[#2d2d2d] px-3 py-1.5 text-gray-300 border-b border-gray-700">
          {filename}
        </div>
      )}
      <div className="overflow-x-auto">
        {hunks.map((hunk, hunkIdx) => (
          <div key={hunkIdx}>
            {hunkIdx > 0 && (
              <div className="px-3 py-1 text-gray-500 bg-[#252525] text-xs">
                ... lines hidden ...
              </div>
            )}
            {hunk.lines.map((line, lineIdx) => {
              const lineKey = `${hunkIdx}-${lineIdx}`;

              if (line.type === 'add') {
                return (
                  <div key={lineKey} className="bg-green-500/20 text-green-400 flex">
                    <div className="px-3 py-0.5 text-gray-600 select-none min-w-[3rem] text-right border-r border-green-500/30">
                      {line.newLineNum}
                    </div>
                    <div className="px-2 py-0.5 text-green-400 select-none min-w-[1.5rem]">+</div>
                    <div className="px-2 py-0.5 flex-1 whitespace-pre">{line.content || ' '}</div>
                  </div>
                );
              }

              if (line.type === 'delete') {
                return (
                  <div key={lineKey} className="bg-red-500/20 text-red-400 flex">
                    <div className="px-3 py-0.5 text-gray-600 select-none min-w-[3rem] text-right border-r border-red-500/30">
                      {line.oldLineNum}
                    </div>
                    <div className="px-2 py-0.5 text-red-400 select-none min-w-[1.5rem]">-</div>
                    <div className="px-2 py-0.5 flex-1 whitespace-pre">{line.content || ' '}</div>
                  </div>
                );
              }

              return (
                <div key={lineKey} className="text-gray-400 flex">
                  <div className="px-3 py-0.5 text-gray-600 select-none min-w-[3rem] text-right border-r border-gray-700">
                    {line.oldLineNum}
                  </div>
                  <div className="px-2 py-0.5 select-none min-w-[1.5rem]"> </div>
                  <div className="px-2 py-0.5 flex-1 whitespace-pre">{line.content || ' '}</div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function SplitDiffView({
  hunks,
  filename,
  className,
}: {
  hunks: DiffHunk[];
  filename?: string;
  className?: string;
}) {
  return (
    <div className={`bg-[#1e1e1e] rounded-lg overflow-hidden font-mono text-sm ${className}`}>
      {filename && (
        <div className="bg-[#2d2d2d] px-3 py-1.5 text-gray-300 border-b border-gray-700">
          {filename}
        </div>
      )}
      <div className="overflow-x-auto">
        <div className="grid grid-cols-2 gap-px bg-gray-700">
          {/* Headers */}
          <div className="bg-[#2d2d2d] px-3 py-1 text-gray-400 text-xs">Original</div>
          <div className="bg-[#2d2d2d] px-3 py-1 text-gray-400 text-xs">Modified</div>

          {hunks.map((hunk, hunkIdx) => {
            // Group consecutive adds/deletes
            const groups: Array<{ deletes: DiffLine[]; adds: DiffLine[]; contexts: DiffLine[] }> = [];
            let currentGroup = { deletes: [] as DiffLine[], adds: [] as DiffLine[], contexts: [] as DiffLine[] };

            for (const line of hunk.lines) {
              if (line.type === 'delete') {
                if (currentGroup.adds.length > 0 || currentGroup.contexts.length > 0) {
                  groups.push(currentGroup);
                  currentGroup = { deletes: [], adds: [], contexts: [] };
                }
                currentGroup.deletes.push(line);
              } else if (line.type === 'add') {
                if (currentGroup.contexts.length > 0) {
                  groups.push(currentGroup);
                  currentGroup = { deletes: [], adds: [], contexts: [] };
                }
                currentGroup.adds.push(line);
              } else {
                if (currentGroup.deletes.length > 0 || currentGroup.adds.length > 0) {
                  groups.push(currentGroup);
                  currentGroup = { deletes: [], adds: [], contexts: [] };
                }
                currentGroup.contexts.push(line);
              }
            }
            if (currentGroup.deletes.length > 0 || currentGroup.adds.length > 0 || currentGroup.contexts.length > 0) {
              groups.push(currentGroup);
            }

            return (
              <div key={hunkIdx} className="contents">
                {hunkIdx > 0 && (
                  <>
                    <div className="px-3 py-1 text-gray-500 bg-[#252525] text-xs">... lines hidden ...</div>
                    <div className="px-3 py-1 text-gray-500 bg-[#252525] text-xs">... lines hidden ...</div>
                  </>
                )}
                {groups.map((group, groupIdx) => {
                  const maxLines = Math.max(
                    group.deletes.length,
                    group.adds.length,
                    group.contexts.length
                  );

                  return (
                    <div key={`${hunkIdx}-${groupIdx}`} className="contents">
                      {group.contexts.length > 0 ? (
                        // Context lines (same on both sides)
                        group.contexts.map((line, idx) => (
                          <div key={`ctx-${idx}`} className="contents">
                            <div className="text-gray-400 flex bg-[#1e1e1e]">
                              <div className="px-2 py-0.5 text-gray-600 select-none min-w-[3rem] text-right border-r border-gray-700">
                                {line.oldLineNum}
                              </div>
                              <div className="px-2 py-0.5 flex-1 whitespace-pre">{line.content || ' '}</div>
                            </div>
                            <div className="text-gray-400 flex bg-[#1e1e1e]">
                              <div className="px-2 py-0.5 text-gray-600 select-none min-w-[3rem] text-right border-r border-gray-700">
                                {line.newLineNum}
                              </div>
                              <div className="px-2 py-0.5 flex-1 whitespace-pre">{line.content || ' '}</div>
                            </div>
                          </div>
                        ))
                      ) : (
                        // Changes (deletes on left, adds on right)
                        Array.from({ length: maxLines }).map((_, idx) => {
                          const deleteLine = group.deletes[idx];
                          const addLine = group.adds[idx];

                          return (
                            <div key={`change-${idx}`} className="contents">
                              {/* Left side (deletes) */}
                              {deleteLine ? (
                                <div className="bg-red-500/20 text-red-400 flex">
                                  <div className="px-2 py-0.5 text-gray-600 select-none min-w-[3rem] text-right border-r border-red-500/30">
                                    {deleteLine.oldLineNum}
                                  </div>
                                  <div className="px-2 py-0.5 flex-1 whitespace-pre">{deleteLine.content || ' '}</div>
                                </div>
                              ) : (
                                <div className="bg-[#1e1e1e]"></div>
                              )}

                              {/* Right side (adds) */}
                              {addLine ? (
                                <div className="bg-green-500/20 text-green-400 flex">
                                  <div className="px-2 py-0.5 text-gray-600 select-none min-w-[3rem] text-right border-r border-green-500/30">
                                    {addLine.newLineNum}
                                  </div>
                                  <div className="px-2 py-0.5 flex-1 whitespace-pre">{addLine.content || ' '}</div>
                                </div>
                              ) : (
                                <div className="bg-[#1e1e1e]"></div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
