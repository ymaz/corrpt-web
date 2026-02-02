/**
 * Effect Pipeline E2E Tests
 * Validates dev panel, effect activation/deactivation, parameter controls,
 * multi-effect stacking, and console error detection per scenario.
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
	EFFECT_DEV_PANEL,
	effectSection,
	effectToggle,
	paramBool,
	paramSlider,
	paramValue,
} from "../src/lib/test-ids.js";
import { createReporter, errorsSince } from "./helpers/assert.js";
import { closeBrowser, createBrowser } from "./helpers/browser.js";
import { startDevServer, stopServer } from "./helpers/server.js";
import { setSliderValue, uploadImageViaLanding } from "./helpers/upload.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const testImage = path.resolve(__dirname, "test-200x100.png");
const screenshotDir = path.resolve(__dirname, "screenshots");

/**
 * Run the effect pipeline test suite.
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
		// Prerequisite: load page and upload test image
		await page.goto(serverUrl, { waitUntil: "networkidle" });
		await page.waitForTimeout(1000);
		await uploadImageViaLanding(page, testImage);

		// -- 1. Dev panel presence --
		console.log("\n1. Dev panel presence");
		let checkpoint = consoleErrors.length;

		const panelCount = await page
			.locator(`[data-testid="${EFFECT_DEV_PANEL}"]`)
			.count();
		reporter.assert(panelCount === 1, "Dev panel visible");

		const rgbSection = await page
			.locator(`[data-testid="${effectSection("rgbShift")}"]`)
			.count();
		reporter.assert(rgbSection === 1, "RGB Shift section exists");

		const pixelSortSection = await page
			.locator(`[data-testid="${effectSection("pixelSort")}"]`)
			.count();
		reporter.assert(pixelSortSection === 1, "Pixel Sort section exists");

		const passthroughSection = await page
			.locator(`[data-testid="${effectSection("passthrough")}"]`)
			.count();
		reporter.assert(passthroughSection === 0, "Passthrough section absent");

		const rgbToggle = page.locator(
			`[data-testid="${effectToggle("rgbShift")}"]`,
		);
		reporter.assert(
			!(await rgbToggle.isChecked()),
			"RGB Shift toggle unchecked",
		);

		const pixelSortToggle = page.locator(
			`[data-testid="${effectToggle("pixelSort")}"]`,
		);
		reporter.assert(
			!(await pixelSortToggle.isChecked()),
			"Pixel Sort toggle unchecked",
		);

		await page.screenshot({
			path: path.join(screenshotDir, "effects-01-dev-panel.png"),
		});
		console.log("  Screenshot: effects-01-dev-panel.png");

		let newErrors = errorsSince(consoleErrors, checkpoint);
		reporter.assert(newErrors.length === 0, "No console errors in scenario 1");

		// -- 2. Activate RGB Shift --
		console.log("\n2. Activate RGB Shift");
		checkpoint = consoleErrors.length;

		await rgbToggle.check();
		await page.waitForTimeout(500);

		const intensitySlider = await page
			.locator(`[data-testid="${paramSlider("rgbShift", "intensity")}"]`)
			.count();
		reporter.assert(intensitySlider === 1, "Intensity slider visible");

		const angleSlider = await page
			.locator(`[data-testid="${paramSlider("rgbShift", "angle")}"]`)
			.count();
		reporter.assert(angleSlider === 1, "Angle slider visible");

		const animatedBool = await page
			.locator(`[data-testid="${paramBool("rgbShift", "animated")}"]`)
			.count();
		reporter.assert(animatedBool === 1, "Animated checkbox visible");

		const intensityValue = await page
			.locator(`[data-testid="${paramValue("rgbShift", "intensity")}"]`)
			.textContent();
		reporter.assert(
			intensityValue === "0.50",
			`Intensity default is "0.50" (got "${intensityValue}")`,
		);

		const angleValue = await page
			.locator(`[data-testid="${paramValue("rgbShift", "angle")}"]`)
			.textContent();
		reporter.assert(
			angleValue === "0.00",
			`Angle default is "0.00" (got "${angleValue}")`,
		);

		await page.screenshot({
			path: path.join(screenshotDir, "effects-02-rgb-shift-active.png"),
		});
		console.log("  Screenshot: effects-02-rgb-shift-active.png");

		newErrors = errorsSince(consoleErrors, checkpoint);
		reporter.assert(newErrors.length === 0, "No console errors in scenario 2");

		// -- 3. Adjust RGB Shift slider --
		console.log("\n3. Adjust RGB Shift slider");
		checkpoint = consoleErrors.length;

		await setSliderValue(page, paramSlider("rgbShift", "intensity"), 0.8);
		await page.waitForTimeout(500);

		const updatedIntensity = await page
			.locator(`[data-testid="${paramValue("rgbShift", "intensity")}"]`)
			.textContent();
		reporter.assert(
			updatedIntensity === "0.80",
			`Intensity changed to "0.80" (got "${updatedIntensity}")`,
		);

		await page.screenshot({
			path: path.join(screenshotDir, "effects-03-rgb-slider-adjusted.png"),
		});
		console.log("  Screenshot: effects-03-rgb-slider-adjusted.png");

		newErrors = errorsSince(consoleErrors, checkpoint);
		reporter.assert(newErrors.length === 0, "No console errors in scenario 3");

		// -- 4. Activate Pixel Sort --
		console.log("\n4. Activate Pixel Sort");
		checkpoint = consoleErrors.length;

		await pixelSortToggle.check();
		await page.waitForTimeout(500);

		const thresholdSlider = await page
			.locator(`[data-testid="${paramSlider("pixelSort", "threshold")}"]`)
			.count();
		const upperThresholdSlider = await page
			.locator(`[data-testid="${paramSlider("pixelSort", "upperThreshold")}"]`)
			.count();
		const spreadSlider = await page
			.locator(`[data-testid="${paramSlider("pixelSort", "spread")}"]`)
			.count();
		const directionSlider = await page
			.locator(`[data-testid="${paramSlider("pixelSort", "direction")}"]`)
			.count();
		reporter.assert(
			thresholdSlider +
				upperThresholdSlider +
				spreadSlider +
				directionSlider ===
				4,
			"All 4 Pixel Sort sliders visible",
		);

		const thresholdValue = await page
			.locator(`[data-testid="${paramValue("pixelSort", "threshold")}"]`)
			.textContent();
		reporter.assert(
			thresholdValue === "0.25",
			`Threshold default is "0.25" (got "${thresholdValue}")`,
		);

		await page.screenshot({
			path: path.join(screenshotDir, "effects-04-pixel-sort-active.png"),
		});
		console.log("  Screenshot: effects-04-pixel-sort-active.png");

		newErrors = errorsSince(consoleErrors, checkpoint);
		reporter.assert(newErrors.length === 0, "No console errors in scenario 4");

		// -- 5. Multi-effect stacking --
		console.log("\n5. Multi-effect stacking");
		checkpoint = consoleErrors.length;

		// Both effects are active — wait for multi-pass rendering
		await page.waitForTimeout(1000);

		await page.screenshot({
			path: path.join(screenshotDir, "effects-05-multi-effect.png"),
		});
		console.log("  Screenshot: effects-05-multi-effect.png");

		newErrors = errorsSince(consoleErrors, checkpoint);
		reporter.assert(
			newErrors.length === 0,
			"No console errors with multi-effect stacking",
		);

		// -- 6. Adjust Pixel Sort slider --
		console.log("\n6. Adjust Pixel Sort slider");
		checkpoint = consoleErrors.length;

		await setSliderValue(page, paramSlider("pixelSort", "spread"), 150);
		await page.waitForTimeout(500);

		const updatedSpread = await page
			.locator(`[data-testid="${paramValue("pixelSort", "spread")}"]`)
			.textContent();
		reporter.assert(
			updatedSpread === "150.00",
			`Spread changed to "150.00" (got "${updatedSpread}")`,
		);

		await page.screenshot({
			path: path.join(screenshotDir, "effects-06-pixel-sort-adjusted.png"),
		});
		console.log("  Screenshot: effects-06-pixel-sort-adjusted.png");

		newErrors = errorsSince(consoleErrors, checkpoint);
		reporter.assert(newErrors.length === 0, "No console errors in scenario 6");

		// -- 7. Deactivate RGB Shift --
		console.log("\n7. Deactivate RGB Shift");
		checkpoint = consoleErrors.length;

		await rgbToggle.uncheck();
		await page.waitForTimeout(500);

		const rgbSlidersGone = await page
			.locator(`[data-testid="${paramSlider("rgbShift", "intensity")}"]`)
			.count();
		reporter.assert(
			rgbSlidersGone === 0,
			"RGB Shift controls gone after deactivation",
		);

		const pixelSortStillActive = await page
			.locator(`[data-testid="${paramSlider("pixelSort", "threshold")}"]`)
			.count();
		reporter.assert(pixelSortStillActive === 1, "Pixel Sort still active");

		await page.screenshot({
			path: path.join(screenshotDir, "effects-07-rgb-deactivated.png"),
		});
		console.log("  Screenshot: effects-07-rgb-deactivated.png");

		newErrors = errorsSince(consoleErrors, checkpoint);
		reporter.assert(newErrors.length === 0, "No console errors in scenario 7");

		// -- 8. Deactivate all --
		console.log("\n8. Deactivate all effects");
		checkpoint = consoleErrors.length;

		await pixelSortToggle.uncheck();
		await page.waitForTimeout(500);

		const anyParamSliders = await page
			.locator("[data-testid^='param-slider-']")
			.count();
		reporter.assert(anyParamSliders === 0, "No parameter sliders visible");

		const anyParamBools = await page
			.locator("[data-testid^='param-bool-']")
			.count();
		reporter.assert(anyParamBools === 0, "No parameter checkboxes visible");

		await page.screenshot({
			path: path.join(screenshotDir, "effects-08-all-deactivated.png"),
		});
		console.log("  Screenshot: effects-08-all-deactivated.png");

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
