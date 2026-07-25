const fs = require("fs");
const path = require("path");

const MAX_ALLOWED_LINES = 400;
const WARNING_THRESHOLD = 300;
const IGNORE_DIRS = ["node_modules", ".next", ".git", "dist", "build"];
const TARGET_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".css"];

function countFileLines(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  return content.split("\n").length;
}

function scanDirectory(dirPath, fileList = []) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (!IGNORE_DIRS.includes(entry.name)) {
        scanDirectory(fullPath, fileList);
      }
    } else {
      const ext = path.extname(entry.name);
      if (TARGET_EXTENSIONS.includes(ext)) {
        const lineCount = countFileLines(fullPath);
        fileList.push({
          path: fullPath.replace(process.cwd() + path.sep, ""),
          lines: lineCount,
        });
      }
    }
  }

  return fileList;
}

console.log("🔍 Scanning codebase for file size limits (< 400 lines)...");
const allFiles = scanDirectory(process.cwd());

// Sort descending by line count
allFiles.sort((a, b) => b.lines - a.lines);

const warningFiles = allFiles.filter((f) => f.lines >= WARNING_THRESHOLD);
const errorFiles = allFiles.filter((f) => f.lines > MAX_ALLOWED_LINES);

console.log("\n📊 Top 15 longest files in the project:");
console.table(
  allFiles.slice(0, 15).map((f, i) => ({
    Rank: i + 1,
    File: f.path,
    Lines: f.lines,
    Status: f.lines > MAX_ALLOWED_LINES ? "❌ EXCEEDS 400" : f.lines >= WARNING_THRESHOLD ? "⚠️ > 300 LINES" : "✅ OK",
  }))
);

if (errorFiles.length > 0) {
  console.error(`\n❌ ERROR: ${errorFiles.length} file(s) exceed the strict 400 lines limit:`);
  errorFiles.forEach((f) => console.error(` - ${f.path}: ${f.lines} lines`));
  process.exit(1);
} else {
  console.log(`\n✅ All ${allFiles.length} source files comply with the < 400 lines limit rule!`);
  process.exit(0);
}
