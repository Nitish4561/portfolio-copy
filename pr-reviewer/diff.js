export function splitDiffByFile(diff) {
    const files = [];
    const lines = diff.split("\n");
  
    let currentFile = null;
    let currentDiff = [];
  
    for (const line of lines) {
      // New file detected
      if (line.startsWith("+++ b/")) {
        // Save previous file
        if (currentFile) {
          files.push({
            path: currentFile,
            diff: currentDiff.join("\n"),
          });
        }
  
        currentFile = line.replace("+++ b/", "").trim();
        currentDiff = [line];
        continue;
      }
  
      if (currentFile) {
        currentDiff.push(line);
      }
    }
  
    // Push last file
    if (currentFile) {
      files.push({
        path: currentFile,
        diff: currentDiff.join("\n"),
      });
    }
  
    return files;
  }
  