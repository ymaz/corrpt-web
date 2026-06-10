import path from "node:path";
import { fileURLToPath } from "node:url";

import {
	EFFECT_DEV_PANEL,
	effectAdd,
	effectSection,
	LAYERS_COUNT,
	LAYERS_PANEL,
	layerDuplicate,
	layerMoveDown,
	layerRemove,
	layerToggle,
	paramSlider,
	paramValue,
} from "../src/lib/test-ids";
import {
	expect,
	getEffectInstanceIds,
	type Page,
	setSliderValue,
	test,
	uploadViaLanding,
} from "./fixtures";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testImage = path.resolve(__dirname, "test-200x100.png");

/** Effect ids of all layers in display order (top = applied last). */
async function getLayerEffectIdsInDisplayOrder(page: Page): Promise<string[]> {
	return page
		.getByTestId(LAYERS_PANEL)
		.locator("[data-testid^='layer-item-']")
		.evaluateAll((elements) =>
			elements.map((element) => element.getAttribute("data-effect-id") ?? ""),
		);
}

test.describe("effects", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		await uploadViaLanding(page, testImage);
		await expect(page.getByTestId(EFFECT_DEV_PANEL)).toBeVisible();
	});

	test("panel renders catalog add buttons; layers panel hidden until a layer exists", async ({
		page,
		consoleErrors,
	}) => {
		await expect(page.getByTestId(effectSection("rgbShiftV2"))).toBeVisible();
		await expect(page.getByTestId(effectSection("pixelSort"))).toBeVisible();
		await expect(page.getByTestId(effectSection("passthrough"))).toHaveCount(0);
		await expect(page.getByTestId(effectAdd("rgbShiftV2"))).toBeEnabled();
		await expect(page.getByTestId(LAYERS_PANEL)).toHaveCount(0);
		expect(consoleErrors).toEqual([]);
	});

	test("adding RGB Shift creates a layer with parameter controls and defaults", async ({
		page,
		consoleErrors,
	}) => {
		await page.getByTestId(effectAdd("rgbShiftV2")).click();
		const [instanceId] = await getEffectInstanceIds(page, "rgbShiftV2");

		await expect(page.getByTestId(LAYERS_COUNT)).toHaveText("1/10");
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
		await page.getByTestId(effectAdd("rgbShiftV2")).click();
		const [instanceId] = await getEffectInstanceIds(page, "rgbShiftV2");
		await setSliderValue(page, paramSlider(instanceId, "intensity"), 0.8);
		await expect(
			page.getByTestId(paramValue(instanceId, "intensity")),
		).toHaveText("0.80");
		expect(consoleErrors).toEqual([]);
	});

	test("duplicating a layer creates an independent layer", async ({
		page,
		consoleErrors,
	}) => {
		await page.getByTestId(effectAdd("rgbShiftV2")).click();
		const [firstInstanceId] = await getEffectInstanceIds(page, "rgbShiftV2");
		await setSliderValue(page, paramSlider(firstInstanceId, "intensity"), 0.8);
		await page.getByTestId(layerDuplicate(firstInstanceId)).click();
		await expect(page.getByTestId(LAYERS_COUNT)).toHaveText("2/10");

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

	test("deleting one duplicate leaves the other layer active", async ({
		page,
		consoleErrors,
	}) => {
		await page.getByTestId(effectAdd("rgbShiftV2")).click();
		const [firstInstanceId] = await getEffectInstanceIds(page, "rgbShiftV2");
		await page.getByTestId(layerDuplicate(firstInstanceId)).click();
		await expect(page.getByTestId(LAYERS_COUNT)).toHaveText("2/10");

		await page.getByTestId(layerRemove(firstInstanceId)).click();
		await expect(page.getByTestId(LAYERS_COUNT)).toHaveText("1/10");
		const [remainingInstanceId] = await getEffectInstanceIds(
			page,
			"rgbShiftV2",
		);
		await expect(
			page.getByTestId(paramSlider(remainingInstanceId, "intensity")),
		).toBeVisible();
		expect(consoleErrors).toEqual([]);
	});

	test("adding Pixel Sort reveals its 4 parameter sliders with defaults", async ({
		page,
		consoleErrors,
	}) => {
		await page.getByTestId(effectAdd("pixelSort")).click();
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

	test("layers of different effects can be active simultaneously", async ({
		page,
		consoleErrors,
	}) => {
		await page.getByTestId(effectAdd("rgbShiftV2")).click();
		await page.getByTestId(effectAdd("pixelSort")).click();
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
		await page.getByTestId(effectAdd("pixelSort")).click();
		const [instanceId] = await getEffectInstanceIds(page, "pixelSort");
		await setSliderValue(page, paramSlider(instanceId, "spread"), 150);
		await expect(page.getByTestId(paramValue(instanceId, "spread"))).toHaveText(
			"150.00",
		);
		expect(consoleErrors).toEqual([]);
	});

	test("new layers stack on top and move buttons reorder them", async ({
		page,
		consoleErrors,
	}) => {
		await page.getByTestId(effectAdd("rgbShiftV2")).click();
		await page.getByTestId(effectAdd("pixelSort")).click();

		// Top = applied last, so the most recently added layer leads the list.
		expect(await getLayerEffectIdsInDisplayOrder(page)).toEqual([
			"pixelSort",
			"rgbShiftV2",
		]);

		const [pixelSortInstanceId] = await getEffectInstanceIds(page, "pixelSort");
		await page.getByTestId(layerMoveDown(pixelSortInstanceId)).click();
		expect(await getLayerEffectIdsInDisplayOrder(page)).toEqual([
			"rgbShiftV2",
			"pixelSort",
		]);
		expect(consoleErrors).toEqual([]);
	});

	test("unchecking a layer disables it without removing its controls", async ({
		page,
		consoleErrors,
	}) => {
		await page.getByTestId(effectAdd("rgbShiftV2")).click();
		const [instanceId] = await getEffectInstanceIds(page, "rgbShiftV2");

		await page.getByTestId(layerToggle(instanceId)).uncheck();
		await expect(page.getByTestId(layerToggle(instanceId))).not.toBeChecked();
		await expect(
			page.getByTestId(paramSlider(instanceId, "intensity")),
		).toBeVisible();

		await page.getByTestId(layerToggle(instanceId)).check();
		await expect(page.getByTestId(layerToggle(instanceId))).toBeChecked();
		expect(consoleErrors).toEqual([]);
	});

	test("deleting all layers hides the layers panel", async ({
		page,
		consoleErrors,
	}) => {
		await page.getByTestId(effectAdd("rgbShiftV2")).click();
		await page.getByTestId(effectAdd("pixelSort")).click();
		const [[rgbShiftInstanceId], [pixelSortInstanceId]] = await Promise.all([
			getEffectInstanceIds(page, "rgbShiftV2"),
			getEffectInstanceIds(page, "pixelSort"),
		]);

		await page.getByTestId(layerRemove(rgbShiftInstanceId)).click();
		await page.getByTestId(layerRemove(pixelSortInstanceId)).click();

		await expect(page.getByTestId(LAYERS_PANEL)).toHaveCount(0);
		await expect(page.locator("[data-testid^='param-slider-']")).toHaveCount(0);
		expect(consoleErrors).toEqual([]);
	});

	test("layer cap disables add buttons at 10 layers", async ({
		page,
		consoleErrors,
	}) => {
		for (let i = 0; i < 10; i++) {
			await page.getByTestId(effectAdd("rgbShiftV2")).click();
		}
		await expect(page.getByTestId(LAYERS_COUNT)).toHaveText("10/10");
		await expect(page.getByTestId(effectAdd("rgbShiftV2"))).toBeDisabled();
		await expect(page.getByTestId(effectAdd("pixelSort"))).toBeDisabled();
		expect(consoleErrors).toEqual([]);
	});
});
