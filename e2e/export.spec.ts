import path from "node:path";
import { fileURLToPath } from "node:url";

import { DOWNLOAD_BUTTON, effectToggle } from "../src/lib/test-ids";
import { expect, test, uploadViaLanding } from "./fixtures";

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
		await page.getByTestId(effectToggle("rgbShift")).check();

		const downloadPromise = page.waitForEvent("download");
		await page.getByTestId(DOWNLOAD_BUTTON).click();
		const download = await downloadPromise;

		expect(await download.failure()).toBeNull();
		expect(consoleErrors).toEqual([]);
	});
});
