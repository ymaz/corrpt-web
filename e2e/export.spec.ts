import path from "node:path";
import { fileURLToPath } from "node:url";

import { DOWNLOAD_BUTTON } from "../src/lib/test-ids";
import {
	activateMultiPassAuxFixture,
	addEffectLayer,
	expect,
	test,
	uploadViaLanding,
} from "./fixtures";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testImage = path.resolve(__dirname, "test-200x100.png");

test.describe("export", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		await uploadViaLanding(page, testImage);
	});

	test("download with no effects triggers file download without errors", async ({
		page,
		consoleErrors,
	}) => {
		const downloadPromise = page.waitForEvent("download");
		await page.getByTestId(DOWNLOAD_BUTTON).click();
		const download = await downloadPromise;

		expect(await download.failure()).toBeNull();
		expect(consoleErrors).toEqual([]);
	});

	test("download with an active effect triggers file download without errors", async ({
		page,
		consoleErrors,
	}) => {
		await addEffectLayer(page, "rgbShiftV2");

		const downloadPromise = page.waitForEvent("download");
		await page.getByTestId(DOWNLOAD_BUTTON).click();
		const download = await downloadPromise;

		expect(await download.failure()).toBeNull();
		expect(consoleErrors).toEqual([]);
	});

	// A multi-pass effect forces the export path to allocate scratch framebuffers
	// in its dedicated off-screen context — exercise that end to end.
	test("download with a multi-pass effect triggers file download without errors", async ({
		page,
		consoleErrors,
	}) => {
		await activateMultiPassAuxFixture(page);

		const downloadPromise = page.waitForEvent("download");
		await page.getByTestId(DOWNLOAD_BUTTON).click();
		const download = await downloadPromise;

		expect(await download.failure()).toBeNull();
		expect(consoleErrors).toEqual([]);
	});
});
