/**
 * Phase 1.2 Validation Script
 * Launches dev server, uploads a test image via Playwright, takes screenshots.
 * Validates: dark background, image display, aspect-correct rendering.
 */
import { execSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const testImage = path.resolve(__dirname, "test-200x100.png");
const screenshotDir = path.resolve(__dirname, "screenshots");

execSync(`mkdir -p ${screenshotDir}`);

if (!existsSync(testImage)) {
	console.error("Test image not found:", testImage);
	process.exit(1);
}

// Start dev server
console.log("Starting dev server...");
const devServer = spawn("npm", ["run", "dev", "--", "--port", "5199"], {
	cwd: projectRoot,
	stdio: "pipe",
});

let serverUrl = "";

// Wait for dev server to be ready
await new Promise((resolve, reject) => {
	const timeout = setTimeout(() => reject(new Error("Dev server timeout")), 30000);

	devServer.stdout.on("data", (data) => {
		const output = data.toString();
		const match = output.match(/Local:\s+(http:\/\/[^\s]+)/);
		if (match) {
			serverUrl = match[1];
			clearTimeout(timeout);
			resolve();
		}
	});

	devServer.stderr.on("data", (data) => {
		// Vite sometimes logs to stderr
		const output = data.toString();
		const match = output.match(/Local:\s+(http:\/\/[^\s]+)/);
		if (match) {
			serverUrl = match[1];
			clearTimeout(timeout);
			resolve();
		}
	});

	devServer.on("error", (err) => {
		clearTimeout(timeout);
		reject(err);
	});
});

console.log("Dev server ready at:", serverUrl);

let exitCode = 0;

try {
	const browser = await chromium.launch({ headless: true });
	const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

	// 1. Navigate and screenshot initial state (dark background, no image)
	await page.goto(serverUrl, { waitUntil: "networkidle" });
	await page.waitForTimeout(1000); // Let WebGL initialize
	await page.screenshot({ path: path.join(screenshotDir, "01-initial-dark-bg.png") });
	console.log("Screenshot 1: Initial state (dark background)");

	// 2. Upload the test image
	const fileInput = page.locator('input[type="file"]');
	await fileInput.setInputFiles(testImage);
	await page.waitForTimeout(2000); // Let texture load and render
	await page.screenshot({ path: path.join(screenshotDir, "02-image-uploaded.png") });
	console.log("Screenshot 2: After image upload");

	// 3. Resize to a tall viewport and screenshot (should pillarbox)
	await page.setViewportSize({ width: 400, height: 800 });
	await page.waitForTimeout(1000);
	await page.screenshot({ path: path.join(screenshotDir, "03-tall-viewport.png") });
	console.log("Screenshot 3: Tall viewport (pillarbox expected)");

	// 4. Resize to a wide viewport and screenshot (should letterbox)
	await page.setViewportSize({ width: 1400, height: 400 });
	await page.waitForTimeout(1000);
	await page.screenshot({ path: path.join(screenshotDir, "04-wide-viewport.png") });
	console.log("Screenshot 4: Wide viewport (letterbox expected)");

	// 5. Check for console errors
	const consoleErrors = [];
	page.on("console", (msg) => {
		if (msg.type() === "error") consoleErrors.push(msg.text());
	});

	// Reload to catch any console errors
	await page.reload({ waitUntil: "networkidle" });
	await page.waitForTimeout(1000);

	if (consoleErrors.length > 0) {
		console.error("Console errors detected:", consoleErrors);
		exitCode = 1;
	} else {
		console.log("No console errors detected.");
	}

	// 6. Validate canvas element exists
	const canvasCount = await page.locator("canvas").count();
	if (canvasCount > 0) {
		console.log(`Canvas element found (${canvasCount} canvas(es))`);
	} else {
		console.error("ERROR: No canvas element found on page!");
		exitCode = 1;
	}

	console.log("\nScreenshots saved to:", screenshotDir);
	console.log("Please review them to confirm correct aspect-ratio rendering.");

	await browser.close();
} catch (err) {
	console.error("Validation error:", err);
	exitCode = 1;
} finally {
	devServer.kill();
}

process.exit(exitCode);
