/**
 * Upload & Input E2E Tests
 * Validates DropZone landing, file upload, image replacement, error handling,
 * and aspect-correct rendering.
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
	DROPZONE_LANDING,
	IMAGE_ERROR,
	REPLACE_FILE_INPUT,
	REPLACE_IMAGE_BUTTON,
} from "../src/lib/test-ids.js";
import { createReporter, errorsSince } from "./helpers/assert.js";
import { closeBrowser, createBrowser } from "./helpers/browser.js";
import { startDevServer, stopServer } from "./helpers/server.js";
import {
	uploadImageViaLanding,
	uploadImageViaReplace,
} from "./helpers/upload.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const testImage = path.resolve(__dirname, "test-200x100.png");
const screenshotDir = path.resolve(__dirname, "screenshots");

/**
 * Run the upload test suite.
 * @param {string} serverUrl  URL of a running dev server
 * @returns {Promise<number>}  Exit code (0 = pass)
 */
export async function run(serverUrl) {
	execSync(`mkdir -p ${screenshotDir}`);

	if (!existsSync(testImage)) {
		console.error("Test image not found:", testImage);
		return 1;
	}

	const reporter = createReporter();
	const ctx = await createBrowser();
	const { page, consoleErrors } = ctx;

	try {
		let checkpoint = consoleErrors.length;

		// -- 1. Initial state: DropZone landing card --
		console.log("\n1. Initial state (DropZone landing)");
		checkpoint = consoleErrors.length;
		await page.goto(serverUrl, { waitUntil: "networkidle" });
		await page.waitForTimeout(1000);

		const canvasCount = await page.locator("canvas").count();
		reporter.assert(canvasCount > 0, "Canvas element exists");

		const landingCount = await page
			.locator(`[data-testid="${DROPZONE_LANDING}"]`)
			.count();
		reporter.assert(landingCount > 0, "Landing card visible");

		const replaceBtnCount = await page
			.locator(`[data-testid="${REPLACE_IMAGE_BUTTON}"]`)
			.count();
		reporter.assert(
			replaceBtnCount === 0,
			"Replace button hidden when no image",
		);

		await page.screenshot({
			path: path.join(screenshotDir, "upload-01-landing-card.png"),
		});
		console.log("  Screenshot: upload-01-landing-card.png");

		let newErrors = errorsSince(consoleErrors, checkpoint);
		reporter.assert(newErrors.length === 0, "No console errors in scenario 1");

		// -- 2. Upload image via click-to-browse --
		console.log("\n2. Upload image via click-to-browse");
		checkpoint = consoleErrors.length;
		await uploadImageViaLanding(page, testImage);

		const landingAfterUpload = await page
			.locator(`[data-testid="${DROPZONE_LANDING}"]`)
			.count();
		reporter.assert(
			landingAfterUpload === 0,
			"Landing card hidden after image load",
		);

		const replaceBtnAfter = await page
			.locator(`[data-testid="${REPLACE_IMAGE_BUTTON}"]`)
			.count();
		reporter.assert(
			replaceBtnAfter === 1,
			"Replace button visible after image load",
		);

		await page.screenshot({
			path: path.join(screenshotDir, "upload-02-image-uploaded.png"),
		});
		console.log("  Screenshot: upload-02-image-uploaded.png");

		newErrors = errorsSince(consoleErrors, checkpoint);
		reporter.assert(newErrors.length === 0, "No console errors in scenario 2");

		// -- 3. Aspect-correct rendering: tall viewport (pillarbox) --
		console.log("\n3. Tall viewport (pillarbox)");
		checkpoint = consoleErrors.length;
		await page.setViewportSize({ width: 400, height: 800 });
		await page.waitForTimeout(1000);
		await page.screenshot({
			path: path.join(screenshotDir, "upload-03-tall-viewport.png"),
		});
		console.log("  Screenshot: upload-03-tall-viewport.png");

		newErrors = errorsSince(consoleErrors, checkpoint);
		reporter.assert(newErrors.length === 0, "No console errors in scenario 3");

		// -- 4. Aspect-correct rendering: wide viewport (letterbox) --
		console.log("\n4. Wide viewport (letterbox)");
		checkpoint = consoleErrors.length;
		await page.setViewportSize({ width: 1400, height: 400 });
		await page.waitForTimeout(1000);
		await page.screenshot({
			path: path.join(screenshotDir, "upload-04-wide-viewport.png"),
		});
		console.log("  Screenshot: upload-04-wide-viewport.png");

		newErrors = errorsSince(consoleErrors, checkpoint);
		reporter.assert(newErrors.length === 0, "No console errors in scenario 4");

		// -- 5. Replace image via floating button --
		console.log("\n5. Replace image via floating button");
		checkpoint = consoleErrors.length;
		await page.setViewportSize({ width: 1280, height: 720 });
		await page.waitForTimeout(500);

		await uploadImageViaReplace(page, testImage);

		const landingAfterReplace = await page
			.locator(`[data-testid="${DROPZONE_LANDING}"]`)
			.count();
		reporter.assert(
			landingAfterReplace === 0,
			"Landing card still hidden after image replace",
		);

		const replaceBtnStill = await page
			.locator(`[data-testid="${REPLACE_IMAGE_BUTTON}"]`)
			.count();
		reporter.assert(
			replaceBtnStill === 1,
			"Replace button still visible after replace",
		);

		await page.screenshot({
			path: path.join(screenshotDir, "upload-05-image-replaced.png"),
		});
		console.log("  Screenshot: upload-05-image-replaced.png");

		newErrors = errorsSince(consoleErrors, checkpoint);
		reporter.assert(newErrors.length === 0, "No console errors in scenario 5");

		// -- 6. Error handling: invalid file type --
		console.log("\n6. Error handling: invalid file type");
		checkpoint = consoleErrors.length;
		const invalidFilePath = path.resolve(__dirname, "_temp-invalid.txt");
		execSync(`echo "not an image" > "${invalidFilePath}"`);

		const replaceInput = page.locator(`[data-testid="${REPLACE_FILE_INPUT}"]`);
		await replaceInput.setInputFiles(invalidFilePath);
		await page.waitForTimeout(1000);

		const errorCount = await page
			.locator(`[data-testid="${IMAGE_ERROR}"]`)
			.count();
		reporter.assert(
			errorCount > 0,
			"Error message shown for invalid file type",
		);

		await page.screenshot({
			path: path.join(screenshotDir, "upload-06-error-invalid-type.png"),
		});
		console.log("  Screenshot: upload-06-error-invalid-type.png");

		execSync(`rm -f "${invalidFilePath}"`);

		newErrors = errorsSince(consoleErrors, checkpoint);
		reporter.assert(newErrors.length === 0, "No console errors in scenario 6");

		// -- 7. Reload and verify fresh landing state --
		console.log("\n7. Reload: fresh landing state");
		checkpoint = consoleErrors.length;
		await page.reload({ waitUntil: "networkidle" });
		await page.waitForTimeout(1000);

		const landingAfterReload = await page
			.locator(`[data-testid="${DROPZONE_LANDING}"]`)
			.count();
		reporter.assert(
			landingAfterReload > 0,
			"Landing card reappears after reload",
		);

		const replaceBtnAfterReload = await page
			.locator(`[data-testid="${REPLACE_IMAGE_BUTTON}"]`)
			.count();
		reporter.assert(
			replaceBtnAfterReload === 0,
			"Replace button hidden after reload",
		);

		await page.screenshot({
			path: path.join(screenshotDir, "upload-07-reload-landing.png"),
		});
		console.log("  Screenshot: upload-07-reload-landing.png");

		newErrors = errorsSince(consoleErrors, checkpoint);
		reporter.assert(newErrors.length === 0, "No console errors in scenario 7");

		// -- 8. Upload from fresh landing state --
		console.log("\n8. Upload from fresh landing state");
		checkpoint = consoleErrors.length;
		await uploadImageViaLanding(page, testImage);

		const landingGone = await page
			.locator(`[data-testid="${DROPZONE_LANDING}"]`)
			.count();
		reporter.assert(
			landingGone === 0,
			"Landing card hidden after upload from fresh state",
		);

		await page.screenshot({
			path: path.join(screenshotDir, "upload-08-fresh-upload.png"),
		});
		console.log("  Screenshot: upload-08-fresh-upload.png");

		newErrors = errorsSince(consoleErrors, checkpoint);
		reporter.assert(newErrors.length === 0, "No console errors in scenario 8");

		// -- Summary --
		console.log("\n--- Console Errors ---");
		if (consoleErrors.length > 0) {
			console.error("Total console errors:", consoleErrors);
		} else {
			console.log("No console errors detected.");
		}

		reporter.summary();
		return reporter.exitCode();
	} catch (err) {
		console.error("Test error:", err);
		return 1;
	} finally {
		await closeBrowser(ctx);
	}
}

// Allow standalone execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const server = await startDevServer(projectRoot);
	console.log("Dev server ready at:", server.url);
	try {
		const code = await run(server.url);
		process.exit(code);
	} finally {
		stopServer(server);
	}
}
