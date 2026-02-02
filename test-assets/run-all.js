/**
 * Sequential E2E Test Runner
 * Starts the dev server once and runs all test suites in sequence.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

import { startDevServer, stopServer } from "./helpers/server.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const suites = [
	{ name: "Upload Tests", module: "./test-upload.js" },
	{ name: "Effect Pipeline Tests", module: "./test-effects.js" },
];

console.log("=== E2E Test Runner ===\n");

const server = await startDevServer(projectRoot);
console.log("Dev server ready at:", server.url);

let totalCode = 0;
const results = [];

try {
	for (const suite of suites) {
		console.log(`\n${"=".repeat(50)}`);
		console.log(`Suite: ${suite.name}`);
		console.log("=".repeat(50));

		const { run } = await import(suite.module);
		const code = await run(server.url);
		results.push({ name: suite.name, passed: code === 0 });
		if (code !== 0) totalCode = 1;
	}
} finally {
	stopServer(server);
}

console.log(`\n${"=".repeat(50)}`);
console.log("=== Final Summary ===");
console.log("=".repeat(50));
for (const r of results) {
	console.log(`  ${r.passed ? "PASS" : "FAIL"}: ${r.name}`);
}
console.log(`\nOverall: ${totalCode === 0 ? "ALL PASSED" : "SOME FAILED"}`);

process.exit(totalCode);
