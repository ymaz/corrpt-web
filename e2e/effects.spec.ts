import path from "node:path";
import { fileURLToPath } from "node:url";

import {
	EFFECT_DEV_PANEL,
	effectSection,
	effectToggle,
	paramSlider,
	paramValue,
} from "../src/lib/test-ids";
import {
	expect,
	getEffectInstanceIds,
	setSliderValue,
	test,
	uploadViaLanding,
} from "./fixtures";

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
		await expect(page.getByTestId(effectSection("rgbShiftV2"))).toBeVisible();
		await expect(page.getByTestId(effectSection("pixelSort"))).toBeVisible();
		await expect(page.getByTestId(effectSection("passthrough"))).toHaveCount(0);
		await expect(
			page.getByTestId(effectToggle("rgbShiftV2")),
		).not.toBeChecked();
		await expect(page.getByTestId(effectToggle("pixelSort"))).not.toBeChecked();
		expect(consoleErrors).toEqual([]);
	});

	test("activating RGB Shift reveals its parameter controls with defaults", async ({
		page,
		consoleErrors,
	}) => {
		await page.getByTestId(effectToggle("rgbShiftV2")).check();
		const [instanceId] = await getEffectInstanceIds(page, "rgbShiftV2");

		await expect(
			page.getByTestId(paramSlider(instanceId, "intensity")),
		).toBeVisible();
		await expect(
			page.getByTestId(paramSlider(instanceId, "angle")),
		).toBeVisible();
		await expect(
			page.getByTestId(paramValue(instanceId, "intensity")),
		).toHaveText("0.50");
		await expect(page.getByTestId(paramValue(instanceId, "angle"))).toHaveText(
			"0.00",
		);
		expect(consoleErrors).toEqual([]);
	});

	test("RGB Shift intensity slider updates value display", async ({
		page,
		consoleErrors,
	}) => {
		await page.getByTestId(effectToggle("rgbShiftV2")).check();
		const [instanceId] = await getEffectInstanceIds(page, "rgbShiftV2");
		await setSliderValue(page, paramSlider(instanceId, "intensity"), 0.8);
		await expect(
			page.getByTestId(paramValue(instanceId, "intensity")),
		).toHaveText("0.80");
		expect(consoleErrors).toEqual([]);
	});

	test("duplicating an effect creates independent parameter blocks", async ({
		page,
		consoleErrors,
	}) => {
		await page.getByTestId(effectToggle("rgbShiftV2")).check();
		const [firstInstanceId] = await getEffectInstanceIds(page, "rgbShiftV2");
		await setSliderValue(page, paramSlider(firstInstanceId, "intensity"), 0.8);
		const rgbShiftSection = page.getByTestId(effectSection("rgbShiftV2"));
		await rgbShiftSection.locator("[data-testid^='effect-duplicate-']").click();
		await expect(
			rgbShiftSection.locator("[data-testid^='effect-instance-']"),
		).toHaveCount(2);

		const [sourceInstanceId, duplicateInstanceId] = await getEffectInstanceIds(
			page,
			"rgbShiftV2",
		);
		await expect(
			page.getByTestId(paramValue(sourceInstanceId, "intensity")),
		).toHaveText("0.80");
		await expect(
			page.getByTestId(paramValue(duplicateInstanceId, "intensity")),
		).toHaveText("0.80");

		await setSliderValue(page, paramSlider(sourceInstanceId, "intensity"), 0.2);

		await expect(
			page.getByTestId(paramValue(sourceInstanceId, "intensity")),
		).toHaveText("0.20");
		await expect(
			page.getByTestId(paramValue(duplicateInstanceId, "intensity")),
		).toHaveText("0.80");
		expect(consoleErrors).toEqual([]);
	});

	test("removing one duplicate leaves the other instance active", async ({
		page,
		consoleErrors,
	}) => {
		await page.getByTestId(effectToggle("rgbShiftV2")).check();
		const rgbShiftSection = page.getByTestId(effectSection("rgbShiftV2"));
		await rgbShiftSection.locator("[data-testid^='effect-duplicate-']").click();
		await expect(
			rgbShiftSection.locator("[data-testid^='effect-instance-']"),
		).toHaveCount(2);
		await rgbShiftSection
			.locator("[data-testid^='effect-remove-']")
			.first()
			.click();
		await expect(
			rgbShiftSection.locator("[data-testid^='effect-instance-']"),
		).toHaveCount(1);
		const [instanceId] = await getEffectInstanceIds(page, "rgbShiftV2");

		await expect(page.getByTestId(effectToggle("rgbShiftV2"))).toBeChecked();
		await expect(
			page.getByTestId(paramSlider(instanceId, "intensity")),
		).toBeVisible();
		expect(consoleErrors).toEqual([]);
	});

	test("activating Pixel Sort reveals its 4 parameter sliders with defaults", async ({
		page,
		consoleErrors,
	}) => {
		await page.getByTestId(effectToggle("pixelSort")).check();
		const [instanceId] = await getEffectInstanceIds(page, "pixelSort");

		await expect(
			page.getByTestId(paramSlider(instanceId, "threshold")),
		).toBeVisible();
		await expect(
			page.getByTestId(paramSlider(instanceId, "upperThreshold")),
		).toBeVisible();
		await expect(
			page.getByTestId(paramSlider(instanceId, "spread")),
		).toBeVisible();
		await expect(
			page.getByTestId(paramSlider(instanceId, "angle")),
		).toBeVisible();
		await expect(
			page.getByTestId(paramValue(instanceId, "threshold")),
		).toHaveText("0.25");
		expect(consoleErrors).toEqual([]);
	});

	test("both effects can be active simultaneously", async ({
		page,
		consoleErrors,
	}) => {
		await page.getByTestId(effectToggle("rgbShiftV2")).check();
		await page.getByTestId(effectToggle("pixelSort")).check();
		const [[rgbShiftInstanceId], [pixelSortInstanceId]] = await Promise.all([
			getEffectInstanceIds(page, "rgbShiftV2"),
			getEffectInstanceIds(page, "pixelSort"),
		]);

		await expect(
			page.getByTestId(paramSlider(rgbShiftInstanceId, "intensity")),
		).toBeVisible();
		await expect(
			page.getByTestId(paramSlider(pixelSortInstanceId, "threshold")),
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
		const [instanceId] = await getEffectInstanceIds(page, "pixelSort");
		await setSliderValue(page, paramSlider(instanceId, "spread"), 150);
		await expect(page.getByTestId(paramValue(instanceId, "spread"))).toHaveText(
			"150.00",
		);
		expect(consoleErrors).toEqual([]);
	});

	test("deactivating one effect leaves others active", async ({
		page,
		consoleErrors,
	}) => {
		await page.getByTestId(effectToggle("rgbShiftV2")).check();
		await page.getByTestId(effectToggle("pixelSort")).check();
		const [[rgbShiftInstanceId], [pixelSortInstanceId]] = await Promise.all([
			getEffectInstanceIds(page, "rgbShiftV2"),
			getEffectInstanceIds(page, "pixelSort"),
		]);
		await page.getByTestId(effectToggle("rgbShiftV2")).uncheck();

		await expect(
			page.getByTestId(paramSlider(rgbShiftInstanceId, "intensity")),
		).toHaveCount(0);
		await expect(
			page.getByTestId(paramSlider(pixelSortInstanceId, "threshold")),
		).toBeVisible();
		expect(consoleErrors).toEqual([]);
	});

	test("deactivating all effects hides all parameter controls", async ({
		page,
		consoleErrors,
	}) => {
		await page.getByTestId(effectToggle("rgbShiftV2")).check();
		await page.getByTestId(effectToggle("pixelSort")).check();
		await page.getByTestId(effectToggle("rgbShiftV2")).uncheck();
		await page.getByTestId(effectToggle("pixelSort")).uncheck();

		await expect(page.locator("[data-testid^='param-slider-']")).toHaveCount(0);
		await expect(page.locator("[data-testid^='param-bool-']")).toHaveCount(0);
		expect(consoleErrors).toEqual([]);
	});
});
