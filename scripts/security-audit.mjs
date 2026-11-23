import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);

const filenameRules = [
  /(^|\/)(\.env(?:\..*)?|.*\.(?:pem|key|p12|pfx|jks|keystore))$/i,
  /(^|\/)(?:id_rsa|id_ed25519|credentials(?:\..*)?|secrets?(?:\..*)?)$/i,
];
const contentRules = [
  /-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/,
  /(?:AKIA|ASIA)[0-9A-Z]{16}/,
  /(?:ghp|github_pat|sk_live|sk_test|whsec|tvly)-[A-Za-z0-9_-]{12,}/,
];
const secretAssignmentRule = /(?:password|secret|token|api[_-]?key)\s*[:=]\s*["'][^"'\n]{16,}["']/gi;
const explicitTestPlaceholders = new Set([
  "server-only-token",
  "test-token",
  "example-token",
  "dummy-token",
  "placeholder-token",
]);

const findings = [];
for (const file of files) {
  if (filenameRules.some(rule => rule.test(file))) findings.push(`sensitive filename: ${file}`);
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  for (const rule of contentRules) {
    if (rule.test(text)) findings.push(`secret-like content (${rule}): ${file}`);
  }
  for (const match of text.matchAll(secretAssignmentRule)) {
    const value = match[0].match(/["']([^"']+)["']\s*$/)?.[1];
    if (!value || !explicitTestPlaceholders.has(value)) {
      findings.push(`secret-like content (${secretAssignmentRule}): ${file}`);
      break;
    }
  }
}

if (findings.length) {
  console.error("Security audit failed:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log(`Security audit passed: ${files.length} tracked files checked.`);
