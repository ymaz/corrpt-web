import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
	DROPZONE_LANDING,
	IMAGE_ERROR,
	REPLACE_FILE_INPUT,
	REPLACE_IMAGE_BUTTON,
} from "../src/lib/test-ids";
import { expect, test, uploadViaLanding, uploadViaReplace } from "./fixtures";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testImage = path.resolve(__dirname, "test-200x100.png");

test.describe("upload", () => {
	test("shows landing card and hides replace button initially", async ({
		page,
		consoleErrors,
	}) => {
		await page.goto("/");
		await expect(page.locator("canvas")).toBeVisible();
		await expect(page.getByTestId(DROPZONE_LANDING)).toBeVisible();
		await expect(page.getByTestId(REPLACE_IMAGE_BUTTON)).toHaveCount(0);
		expect(consoleErrors).toEqual([]);
	});

	test("upload via landing hides landing and reveals replace button", async ({
		page,
		consoleErrors,
	}) => {
		await page.goto("/");
		await uploadViaLanding(page, testImage);
		await expect(page.getByTestId(DROPZONE_LANDING)).toHaveCount(0);
		await expect(page.getByTestId(REPLACE_IMAGE_BUTTON)).toBeVisible();
		expect(consoleErrors).toEqual([]);
	});

	for (const { width, height, label } of [
		{ width: 400, height: 800, label: "tall pillarbox" },
		{ width: 1400, height: 400, label: "wide letterbox" },
	]) {
		test(`renders without errors after resize to ${label} viewport`, async ({
			page,
			consoleErrors,
		}) => {
			await page.goto("/");
			await uploadViaLanding(page, testImage);
			await expect(page.getByTestId(REPLACE_IMAGE_BUTTON)).toBeVisible();
			await page.setViewportSize({ width, height });
			await page.waitForTimeout(500);
			expect(consoleErrors).toEqual([]);
		});
	}

	test("replace button uploads a new image", async ({
		page,
		consoleErrors,
	}) => {
		await page.goto("/");
		await uploadViaLanding(page, testImage);
		await uploadViaReplace(page, testImage);
		await expect(page.getByTestId(DROPZONE_LANDING)).toHaveCount(0);
		await expect(page.getByTestId(REPLACE_IMAGE_BUTTON)).toBeVisible();
		expect(consoleErrors).toEqual([]);
	});

	test("shows error for invalid file type", async ({
		page,
		consoleErrors,
	}, testInfo) => {
		await page.goto("/");
		await uploadViaLanding(page, testImage);

		await mkdir(testInfo.outputDir, { recursive: true });
		const invalidFile = path.join(testInfo.outputDir, "invalid.txt");
		await writeFile(invalidFile, "not an image");

		await page
			.locator(`[data-testid="${REPLACE_FILE_INPUT}"]`)
			.setInputFiles(invalidFile);

		await expect(page.getByTestId(IMAGE_ERROR)).toBeVisible();
		expect(consoleErrors).toEqual([]);
	});

	test("landing reappears after reload", async ({ page, consoleErrors }) => {
		await page.goto("/");
		await uploadViaLanding(page, testImage);
		await expect(page.getByTestId(REPLACE_IMAGE_BUTTON)).toBeVisible();

		await page.reload();

		await expect(page.getByTestId(DROPZONE_LANDING)).toBeVisible();
		await expect(page.getByTestId(REPLACE_IMAGE_BUTTON)).toHaveCount(0);
		expect(consoleErrors).toEqual([]);
	});

	test("upload from fresh landing state succeeds", async ({
		page,
		consoleErrors,
	}) => {
		await page.goto("/");
		await expect(page.getByTestId(DROPZONE_LANDING)).toBeVisible();

		await uploadViaLanding(page, testImage);

		await expect(page.getByTestId(DROPZONE_LANDING)).toHaveCount(0);
		await expect(page.getByTestId(REPLACE_IMAGE_BUTTON)).toBeVisible();
		expect(consoleErrors).toEqual([]);
	});
});
