import {
	LANDING_FILE_INPUT,
	REPLACE_FILE_INPUT,
} from "../../src/lib/test-ids.js";

/**
 * Upload an image via the landing page file input.
 * @param {import('playwright').Page} page
 * @param {string} filePath  Absolute path to the image file
 * @param {number} [waitMs=2000]  Time to wait after upload
 */
export async function uploadImageViaLanding(page, filePath, waitMs = 2000) {
	const input = page.locator(`[data-testid="${LANDING_FILE_INPUT}"]`);
	await input.setInputFiles(filePath);
	await page.waitForTimeout(waitMs);
}

/**
 * Upload an image via the replace button file input.
 * @param {import('playwright').Page} page
 * @param {string} filePath  Absolute path to the image file
 * @param {number} [waitMs=2000]  Time to wait after upload
 */
export async function uploadImageViaReplace(page, filePath, waitMs = 2000) {
	const input = page.locator(`[data-testid="${REPLACE_FILE_INPUT}"]`);
	await input.setInputFiles(filePath);
	await page.waitForTimeout(waitMs);
}

/**
 * Set a range input's value by evaluating in the page context.
 * Playwright's fill() doesn't work on range inputs, so we use evaluate
 * to set the value and dispatch input+change events.
 * @param {import('playwright').Page} page
 * @param {string} testId  The data-testid of the range input
 * @param {number} value   The value to set
 */
export async function setSliderValue(page, testId, value) {
	await page.evaluate(
		({ testId, value }) => {
			const el = document.querySelector(`[data-testid="${testId}"]`);
			if (!el) throw new Error(`Slider not found: ${testId}`);
			const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
				HTMLInputElement.prototype,
				"value",
			).set;
			nativeInputValueSetter.call(el, value);
			el.dispatchEvent(new Event("input", { bubbles: true }));
			el.dispatchEvent(new Event("change", { bubbles: true }));
		},
		{ testId, value },
	);
}
