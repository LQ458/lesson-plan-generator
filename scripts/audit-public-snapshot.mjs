import { execFileSync } from "node:child_process";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const ignoredDirectories = new Set([
  ".git",
  ".next",
  ".pnpm-store",
  "coverage",
  "dist",
  "node_modules"
]);
const forbiddenTopLevel = new Set([
  ".claude",
  ".cursor",
  ".idea",
  ".metadata",
  ".omc",
  ".vscode",
  "CLAUDE.md",
  "mcp-server"
]);
const forbiddenExtensions = new Set([
  ".bin",
  ".db",
  ".doc",
  ".docx",
  ".pdf",
  ".sqlite",
  ".sqlite3",
  ".xls",
  ".xlsx"
]);
const allowedEnvironmentFile = ".env.example";
const maxSourceFileBytes = 1_000_000;

async function filesFromDisk(directory = root) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignoredDirectories.has(entry.name)) {
      continue;
    }
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      output.push(...(await filesFromDisk(absolute)));
    } else if (entry.isFile()) {
      output.push(path.relative(root, absolute));
    }
  }
  return output.sort();
}

async function filesForAudit() {
  try {
    const output = execFileSync("git", ["ls-files", "-z"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });
    const tracked = output.split("\0").filter(Boolean);
    return tracked.length > 0 ? tracked : filesFromDisk();
  } catch {
    return filesFromDisk();
  }
}

function looksBinary(buffer) {
  return buffer.subarray(0, Math.min(buffer.length, 8192)).includes(0);
}

function environmentFileIsForbidden(relative) {
  const basename = path.basename(relative);
  return (
    basename.startsWith(".env") &&
    basename !== allowedEnvironmentFile
  );
}

const secretPatterns = [
  {
    label: "private key",
    expression: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g
  },
  {
    label: "GitHub token",
    expression: /gh[pousr]_[A-Za-z0-9]{20,}/g
  },
  {
    label: "AWS access key",
    expression: /AKIA[0-9A-Z]{16}/g
  },
  {
    label: "provider-style API key",
    expression: /\bsk-[A-Za-z0-9_-]{16,}\b/g
  },
  {
    label: "JWT",
    expression:
      /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g
  }
];

const piiPatterns = [
  {
    label: "email address",
    expression: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
  },
  {
    label: "mainland China identity number",
    expression: /\b[1-9]\d{5}(?:19|20)\d{2}[01]\d[0-3]\d\d{3}[\dXx]\b/g
  },
  {
    label: "phone-like number",
    expression: /(?<!\d)(?:\+?\d[\s-]?){10,14}(?!\d)/g
  }
];

const absolutePathPatterns = [
  new RegExp("/" + "Users/", "g"),
  new RegExp("[A-Za-z]:\\\\(?:" + "Users|Documents)\\\\", "g")
];

const files = await filesForAudit();
const findings = [];
let binaryFiles = 0;
const forbiddenExtensionFiles = [];

for (const relative of files) {
  const normalized = relative.split(path.sep).join("/");
  const firstSegment = normalized.split("/")[0];
  const extension = path.extname(normalized).toLowerCase();

  if (forbiddenTopLevel.has(firstSegment)) {
    findings.push(`${normalized}: forbidden project metadata or tool path`);
  }
  if (environmentFileIsForbidden(normalized)) {
    findings.push(`${normalized}: environment file must not be tracked`);
  }
  if (forbiddenExtensions.has(extension)) {
    findings.push(`${normalized}: forbidden binary/data extension ${extension}`);
    forbiddenExtensionFiles.push(normalized);
  }
  if (
    normalized.endsWith(".log") ||
    normalized.includes("/logs/") ||
    normalized.includes("/rag_data/") ||
    normalized.includes("/exported_csv/")
  ) {
    findings.push(`${normalized}: forbidden log or private data path`);
  }

  const absolute = path.join(root, relative);
  const metadata = await stat(absolute);
  if (metadata.size > maxSourceFileBytes) {
    findings.push(
      `${normalized}: file exceeds ${maxSourceFileBytes.toLocaleString()} bytes`
    );
  }

  const buffer = await readFile(absolute);
  if (looksBinary(buffer)) {
    findings.push(`${normalized}: binary content detected`);
    binaryFiles += 1;
    continue;
  }

  const content = buffer.toString("utf8");
  for (const pattern of secretPatterns) {
    if (pattern.expression.test(content)) {
      findings.push(`${normalized}: possible ${pattern.label}`);
    }
    pattern.expression.lastIndex = 0;
  }
  for (const pattern of piiPatterns) {
    if (pattern.expression.test(content)) {
      findings.push(`${normalized}: possible ${pattern.label}`);
    }
    pattern.expression.lastIndex = 0;
  }
  for (const expression of absolutePathPatterns) {
    if (expression.test(content)) {
      findings.push(`${normalized}: absolute local path detected`);
    }
    expression.lastIndex = 0;
  }
}

const report = {
  status: findings.length === 0 ? "pass" : "fail",
  filesAudited: files.length,
  binaryFiles,
  environmentFiles:
    files.filter((file) => path.basename(file).startsWith(".env")).sort(),
  forbiddenExtensions: forbiddenExtensionFiles.sort(),
  findings
};

console.info(JSON.stringify(report, null, 2));
if (findings.length > 0) {
  process.exitCode = 1;
}
