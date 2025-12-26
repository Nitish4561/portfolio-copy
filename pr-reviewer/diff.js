/**
 * Split a git diff into separate file diffs.
 * 
 * Handles various git diff formats including:
 * - Standard file changes
 * - File renames (detected via explicit 'rename from/to' lines)
 * - New files (detected via 'new file mode' or '--- /dev/null')
 * - Deleted files (detected via 'deleted file mode' or '+++ /dev/null')
 * - Binary files
 * 
 * @param {string} diff - The complete git diff string
 * @returns {Array<{path: string, diff: string, status?: string}>} Array of file diff objects
 * 
 * @example
 * const result = splitDiffByFile(diffString);
 * // Returns: [
 * //   { path: 'src/app.js', diff: 'diff --git a/src/app.js...', status: 'modified' },
 * //   { path: 'new-name.md', diff: 'diff --git a/old.md b/new-name.md...', status: 'renamed' }
 * // ]
 */
export function splitDiffByFile(diff) {
  const files = [];
  const chunks = diff.split(/^diff --git /m);
  
  for (const chunk of chunks) {
    if (!chunk.trim()) continue;
    
    // Re-add the 'diff --git ' prefix that was removed by split
    const fullDiff = 'diff --git ' + chunk;
    const lines = fullDiff.split('\n');
    
    let path = null;
    let status = 'modified'; // Default status
    
    // Parse the diff header to extract file path and status
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      const line = lines[i];
      
      // Try to extract path from 'diff --git a/path b/path' line
      if (line.startsWith('diff --git ')) {
        const match = line.match(/^diff --git a\/(.+?) b\/(.+?)$/);
        if (match) {
          const newPath = match[2];
          path = newPath; // Always use the new (target) path
        }
      }
      
      // Handle files without 'a/' and 'b/' prefixes
      if (!path && line.startsWith('diff --git ')) {
        const match = line.match(/^diff --git (.+?) (.+?)$/);
        if (match) {
          path = match[2]; // Use the "new" file path
        }
      }
      
      // Extract path from '+++ b/path' line (more reliable for final path)
      if (line.startsWith('+++ b/')) {
        path = line.substring(6).trim(); // Remove '+++ b/' prefix
      } else if (line.startsWith('+++ ') && !line.startsWith('+++ /dev/null')) {
        // Handle '+++ path' without 'b/' prefix
        path = line.substring(4).trim();
      }
      
      // Detect renames explicitly via 'rename from' and 'rename to' lines
      // This is the most reliable way to detect renames in git diffs
      if (line.startsWith('rename from') || line.startsWith('rename to')) {
        status = 'renamed';
      }
      
      // Detect new files
      if (line.includes('new file mode') || line.startsWith('--- /dev/null')) {
        status = 'added';
      }
      
      // Detect deleted files
      if (line.includes('deleted file mode') || line.startsWith('+++ /dev/null')) {
        status = 'deleted';
        // For deleted files, use the old path from '--- a/'
        const oldLine = lines.find(l => l.startsWith('--- a/'));
        if (oldLine) {
          path = oldLine.substring(6).trim();
        }
      }
      
      // Stop parsing header once we hit the hunk
      if (line.startsWith('@@')) break;
    }
    
    // Only add files where we successfully extracted a path
    if (path) {
      files.push({
        path,
        diff: fullDiff,
        status,
      });
    }
  }
  
  return files;
}
