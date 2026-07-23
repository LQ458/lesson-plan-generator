import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

function usage() {
  console.info(
    "Usage: node scripts/summarize-dataset.mjs <chunk-directory> [--recursive]"
  );
}

async function jsonFiles(directory, recursive) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory() && recursive) {
      files.push(...(await jsonFiles(absolute, true)));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".json")) {
      files.push(absolute);
    }
  }
  return files.sort();
}

function chunksFrom(document) {
  if (Array.isArray(document)) {
    return document;
  }
  if (
    document &&
    typeof document === "object" &&
    Array.isArray(document.chunks)
  ) {
    return document.chunks;
  }
  return [];
}

async function summarize(directory, recursive) {
  const files = await jsonFiles(directory, recursive);
  let parsedFiles = 0;
  let parseFailures = 0;
  let totalChunks = 0;
  let aggregateBytes = 0;
  let chunksWithExplicitQualityScore = 0;

  for (const file of files) {
    const metadata = await stat(file);
    aggregateBytes += metadata.size;

    try {
      const document = JSON.parse(await readFile(file, "utf8"));
      const chunks = chunksFrom(document);
      parsedFiles += 1;
      totalChunks += chunks.length;
      chunksWithExplicitQualityScore += chunks.filter((chunk) => {
        if (!chunk || typeof chunk !== "object") {
          return false;
        }
        const score = chunk.qualityScore ?? chunk.quality_score;
        return typeof score === "number" && Number.isFinite(score);
      }).length;
    } catch {
      parseFailures += 1;
    }
  }

  return {
    collectionDate: new Date().toISOString().slice(0, 10),
    traversal: recursive ? "recursive" : "top-level",
    jsonSourceFiles: files.length,
    parsedFiles,
    parseFailures,
    totalChunks,
    aggregateBytes,
    chunksWithExplicitQualityScore,
    qualityScoreCoverage:
      totalChunks === 0
        ? 0
        : Number(
            (chunksWithExplicitQualityScore / totalChunks).toFixed(6)
          )
  };
}

const args = process.argv.slice(2);
if (args.includes("--help") || args.length === 0) {
  usage();
  process.exitCode = args.length === 0 ? 1 : 0;
} else {
  const directory = path.resolve(args[0]);
  const recursive = args.includes("--recursive");
  const summary = await summarize(directory, recursive);
  console.info(JSON.stringify(summary, null, 2));
  if (summary.parseFailures > 0) {
    process.exitCode = 2;
  }
}
