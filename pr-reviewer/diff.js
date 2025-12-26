export function splitDiffByFile(diff) {
    const files = [];
    const fileDiffs = diff.split(/^diff --git /gm).slice(1);
  
    for (const fileDiff of fileDiffs) {
      const headerLine = fileDiff.split("\n")[0];
  
      // Example header:
      // a/src/file.js b/src/file.js
      const match = headerLine.match(/^a\/(.+?) b\/(.+)$/);
  
      if (!match) continue;
  
      files.push({
        path: match[2],
        diff: "diff --git " + fileDiff,
      });
    }
  
    return files;
  }
  