import path from "node:path";
import { fileURLToPath } from "node:url";

import {
	EFFECT_DEV_PANEL,
	effectSection,
	effectToggle,
	paramBool,
	paramSlider,
	paramValue,
} from "../src/lib/test-ids";
import { expect, setSliderValue, test, uploadViaLanding } from "./fixtures";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testImage = path.resolve(__dirname, "test-200x100.png");

test.describe("effects", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		await uploadViaLanding(page, testImage);
		await expect(page.getByTestId(EFFECT_DEV_PANEL)).toBeVisible();
	});

	test("dev panel renders sections for registered effects", async ({
		page,
		consoleErrors,
	}) => {
		await expect(page.getByTestId(effectSection("rgbShift"))).toBeVisible();
		await expect(page.getByTestId(effectSection("pixelSort"))).toBeVisible();
		await expect(page.getByTestId(effectSection("passthrough"))).toHaveCount(0);
		await expect(page.getByTestId(effectToggle("rgbShift"))).not.toBeChecked();
		await expect(page.getByTestId(effectToggle("pixelSort"))).not.toBeChecked();
		expect(consoleErrors).toEqual([]);
	});

	test("activating RGB Shift reveals its parameter controls with defaults", async ({
		page,
		consoleErrors,
	}) => {
		await page.getByTestId(effectToggle("rgbShift")).check();

		await expect(
			page.getByTestId(paramSlider("rgbShift", "intensity")),
		).toBeVisible();
		await expect(
			page.getByTestId(paramSlider("rgbShift", "angle")),
		).toBeVisible();
		await expect(
			page.getByTestId(paramBool("rgbShift", "animated")),
		).toBeVisible();
		await expect(
			page.getByTestId(paramValue("rgbShift", "intensity")),
		).toHaveText("0.50");
		await expect(page.getByTestId(paramValue("rgbShift", "angle"))).toHaveText(
			"0.00",
		);
		expect(consoleErrors).toEqual([]);
	});

	test("RGB Shift intensity slider updates value display", async ({
		page,
		consoleErrors,
	}) => {
		await page.getByTestId(effectToggle("rgbShift")).check();
		await setSliderValue(page, paramSlider("rgbShift", "intensity"), 0.8);
		await expect(
			page.getByTestId(paramValue("rgbShift", "intensity")),
		).toHaveText("0.80");
		expect(consoleErrors).toEqual([]);
	});

	test("activating Pixel Sort reveals its 4 parameter sliders with defaults", async ({
		page,
		consoleErrors,
	}) => {
		await page.getByTestId(effectToggle("pixelSort")).check();

		await expect(
			page.getByTestId(paramSlider("pixelSort", "threshold")),
		).toBeVisible();
		await expect(
			page.getByTestId(paramSlider("pixelSort", "upperThreshold")),
		).toBeVisible();
		await expect(
			page.getByTestId(paramSlider("pixelSort", "spread")),
		).toBeVisible();
		await expect(
			page.getByTestId(paramSlider("pixelSort", "direction")),
		).toBeVisible();
		await expect(
			page.getByTestId(paramValue("pixelSort", "threshold")),
		).toHaveText("0.25");
		expect(consoleErrors).toEqual([]);
	});

	test("both effects can be active simultaneously", async ({
		page,
		consoleErrors,
	}) => {
		await page.getByTestId(effectToggle("rgbShift")).check();
		await page.getByTestId(effectToggle("pixelSort")).check();

		await expect(
			page.getByTestId(paramSlider("rgbShift", "intensity")),
		).toBeVisible();
		await expect(
			page.getByTestId(paramSlider("pixelSort", "threshold")),
		).toBeVisible();
		// Let multi-pass FBO chain render a few frames so any shader/WebGL error
		// has time to surface before we assert no console errors.
		await page.waitForTimeout(500);
		expect(consoleErrors).toEqual([]);
	});

	test("Pixel Sort spread slider updates value display", async ({
		page,
		consoleErrors,
	}) => {
		await page.getByTestId(effectToggle("pixelSort")).check();
		await setSliderValue(page, paramSlider("pixelSort", "spread"), 150);
		await expect(
			page.getByTestId(paramValue("pixelSort", "spread")),
		).toHaveText("150.00");
		expect(consoleErrors).toEqual([]);
	});

	test("deactivating one effect leaves others active", async ({
		page,
		consoleErrors,
	}) => {
		await page.getByTestId(effectToggle("rgbShift")).check();
		await page.getByTestId(effectToggle("pixelSort")).check();
		await page.getByTestId(effectToggle("rgbShift")).uncheck();

		await expect(
			page.getByTestId(paramSlider("rgbShift", "intensity")),
		).toHaveCount(0);
		await expect(
			page.getByTestId(paramSlider("pixelSort", "threshold")),
		).toBeVisible();
		expect(consoleErrors).toEqual([]);
	});

	test("deactivating all effects hides all parameter controls", async ({
		page,
		consoleErrors,
	}) => {
		await page.getByTestId(effectToggle("rgbShift")).check();
		await page.getByTestId(effectToggle("pixelSort")).check();
		await page.getByTestId(effectToggle("rgbShift")).uncheck();
		await page.getByTestId(effectToggle("pixelSort")).uncheck();

		await expect(page.locator("[data-testid^='param-slider-']")).toHaveCount(0);
		await expect(page.locator("[data-testid^='param-bool-']")).toHaveCount(0);
		expect(consoleErrors).toEqual([]);
	});
});
