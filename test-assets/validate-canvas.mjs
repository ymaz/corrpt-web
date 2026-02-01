/**
 * Phase 2.1 Validation Script
 * Launches dev server, validates DropZone landing, file upload via click,
 * image replacement via floating button, error handling, and aspect-correct rendering.
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
	const timeout = setTimeout(
		() => reject(new Error("Dev server timeout")),
		30000,
	);

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
const failures = [];

function assert(condition, name) {
	if (!condition) {
		console.error(`  FAIL: ${name}`);
		failures.push(name);
		exitCode = 1;
	} else {
		console.log(`  PASS: ${name}`);
	}
}

try {
	const browser = await chromium.launch({ headless: true });
	const page = await browser.newPage({
		viewport: { width: 1280, height: 720 },
	});

	// Collect console errors throughout the session
	const consoleErrors = [];
	page.on("console", (msg) => {
		if (msg.type() === "error") consoleErrors.push(msg.text());
	});

	// ── 1. Initial state: DropZone landing card ─────────────────────────
	console.log("\n1. Initial state (DropZone landing)");
	await page.goto(serverUrl, { waitUntil: "networkidle" });
	await page.waitForTimeout(1000);

	// Canvas should exist
	const canvasCount = await page.locator("canvas").count();
	assert(canvasCount > 0, "Canvas element exists");

	// Landing card should be visible with expected text
	const landingText = await page.locator("text=Drop an image here").count();
	assert(landingText > 0, "Landing card shows 'Drop an image here'");

	const browseText = await page.locator("text=or click to browse").count();
	assert(browseText > 0, "Landing card shows 'or click to browse'");

	// Floating replace button should NOT be visible
	const replaceBtn = page.locator("button[title='Replace image']");
	assert(
		(await replaceBtn.count()) === 0,
		"Replace button hidden when no image",
	);

	await page.screenshot({
		path: path.join(screenshotDir, "01-landing-card.png"),
	});
	console.log("  Screenshot: 01-landing-card.png");

	// ── 2. Click landing card to upload via file picker ──────────────────
	console.log("\n2. Upload image via click-to-browse");
	// The landing card is a <button> wrapping a hidden file input
	const fileInput = page.locator(".absolute.inset-0 input[type='file']");
	await fileInput.setInputFiles(testImage);
	await page.waitForTimeout(2000);

	// Landing card should disappear
	const landingAfterUpload = await page
		.locator("text=Drop an image here")
		.count();
	assert(landingAfterUpload === 0, "Landing card hidden after image load");

	// Floating replace button should appear
	const replaceBtnAfter = page.locator("button[title='Replace image']");
	assert(
		(await replaceBtnAfter.count()) === 1,
		"Replace button visible after image load",
	);

	await page.screenshot({
		path: path.join(screenshotDir, "02-image-uploaded.png"),
	});
	console.log("  Screenshot: 02-image-uploaded.png");

	// ── 3. Aspect-correct rendering: tall viewport (pillarbox) ──────────
	console.log("\n3. Tall viewport (pillarbox)");
	await page.setViewportSize({ width: 400, height: 800 });
	await page.waitForTimeout(1000);
	await page.screenshot({
		path: path.join(screenshotDir, "03-tall-viewport.png"),
	});
	console.log("  Screenshot: 03-tall-viewport.png");

	// ── 4. Aspect-correct rendering: wide viewport (letterbox) ──────────
	console.log("\n4. Wide viewport (letterbox)");
	await page.setViewportSize({ width: 1400, height: 400 });
	await page.waitForTimeout(1000);
	await page.screenshot({
		path: path.join(screenshotDir, "04-wide-viewport.png"),
	});
	console.log("  Screenshot: 04-wide-viewport.png");

	// ── 5. Replace image via floating button ────────────────────────────
	console.log("\n5. Replace image via floating button");
	await page.setViewportSize({ width: 1280, height: 720 });
	await page.waitForTimeout(500);

	// The ImageActions component has its own hidden file input
	const replaceInput = page.locator(".absolute.top-4 input[type='file']");
	await replaceInput.setInputFiles(testImage);
	await page.waitForTimeout(2000);

	// Image should still be displayed (replaced with same image)
	const landingAfterReplace = await page
		.locator("text=Drop an image here")
		.count();
	assert(
		landingAfterReplace === 0,
		"Landing card still hidden after image replace",
	);
	const replaceBtnStill = page.locator("button[title='Replace image']");
	assert(
		(await replaceBtnStill.count()) === 1,
		"Replace button still visible after replace",
	);

	await page.screenshot({
		path: path.join(screenshotDir, "05-image-replaced.png"),
	});
	console.log("  Screenshot: 05-image-replaced.png");

	// ── 6. Error handling: invalid file type ────────────────────────────
	console.log("\n6. Error handling: invalid file type");

	// Create a fake .txt file to trigger validation error
	const invalidFilePath = path.resolve(__dirname, "_temp-invalid.txt");
	execSync(`echo "not an image" > "${invalidFilePath}"`);

	// Upload invalid file via the replace button input
	await replaceInput.setInputFiles(invalidFilePath);
	await page.waitForTimeout(1000);

	const errorText = await page.locator("text=Unsupported file type").count();
	assert(errorText > 0, "Error message shown for invalid file type");

	await page.screenshot({
		path: path.join(screenshotDir, "06-error-invalid-type.png"),
	});
	console.log("  Screenshot: 06-error-invalid-type.png");

	// Clean up temp file
	execSync(`rm -f "${invalidFilePath}"`);

	// ── 7. Reload and verify fresh landing state ────────────────────────
	console.log("\n7. Reload: fresh landing state");
	await page.reload({ waitUntil: "networkidle" });
	await page.waitForTimeout(1000);

	const landingAfterReload = await page
		.locator("text=Drop an image here")
		.count();
	assert(landingAfterReload > 0, "Landing card reappears after reload");

	const replaceBtnAfterReload = page.locator("button[title='Replace image']");
	assert(
		(await replaceBtnAfterReload.count()) === 0,
		"Replace button hidden after reload",
	);

	await page.screenshot({
		path: path.join(screenshotDir, "07-reload-landing.png"),
	});
	console.log("  Screenshot: 07-reload-landing.png");

	// ── 8. Upload from fresh landing state ──────────────────────────────
	console.log("\n8. Upload from fresh landing state");
	const freshFileInput = page.locator(".absolute.inset-0 input[type='file']");
	await freshFileInput.setInputFiles(testImage);
	await page.waitForTimeout(2000);

	const landingGone = await page.locator("text=Drop an image here").count();
	assert(
		landingGone === 0,
		"Landing card hidden after upload from fresh state",
	);

	await page.screenshot({
		path: path.join(screenshotDir, "08-fresh-upload.png"),
	});
	console.log("  Screenshot: 08-fresh-upload.png");

	// ── Summary ─────────────────────────────────────────────────────────
	console.log("\n─── Console Errors ───");
	if (consoleErrors.length > 0) {
		console.error("Console errors detected:", consoleErrors);
		exitCode = 1;
	} else {
		console.log("No console errors detected.");
	}

	console.log("\n─── Results ───");
	console.log(`Screenshots saved to: ${screenshotDir}`);
	if (failures.length > 0) {
		console.error(`${failures.length} assertion(s) failed:`);
		for (const f of failures) console.error(`  - ${f}`);
	} else {
		console.log("All assertions passed.");
	}

	await browser.close();
} catch (err) {
	console.error("Validation error:", err);
	exitCode = 1;
} finally {
	devServer.kill();
}

process.exit(exitCode);
