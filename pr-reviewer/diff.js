// pr-reviewer/diff.js
export function splitDiffByFile(diff) {
    const files = [];
    const chunks = diff.split("\ndiff --git ");
  
    for (const chunk of chunks) {
      if (!chunk.trim()) continue;
  
      const match = chunk.match(/a\/(.+?) b\/(.+?)\n/);
      if (!match) continue;
  
      files.push({
        path: match[2],
        diff: "diff --git " + chunk,
      });
    }
  
    return files;
  }
  