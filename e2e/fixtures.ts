import { test as base, expect, type Page } from "@playwright/test";

import { LANDING_FILE_INPUT, REPLACE_FILE_INPUT } from "../src/lib/test-ids";

type Fixtures = {
	consoleErrors: string[];
};

export const test = base.extend<Fixtures>({
	consoleErrors: async ({ page }, use) => {
		const errors: string[] = [];
		page.on("console", (msg) => {
			if (msg.type() === "error") errors.push(msg.text());
		});
		page.on("pageerror", (err) => errors.push(err.stack ?? err.message));
		await use(errors);
	},
});

export { expect };

export async function uploadViaLanding(
	page: Page,
	file: string,
): Promise<void> {
	await page
		.locator(`[data-testid="${LANDING_FILE_INPUT}"]`)
		.setInputFiles(file);
}

export async function uploadViaReplace(
	page: Page,
	file: string,
): Promise<void> {
	await page
		.locator(`[data-testid="${REPLACE_FILE_INPUT}"]`)
		.setInputFiles(file);
}

/**
 * Set a range input's value via DOM manipulation. Playwright's fill() doesn't
 * work on range inputs, so we use the native value setter and dispatch the
 * input/change events React listens for.
 */
export async function setSliderValue(
	page: Page,
	testId: string,
	value: number,
): Promise<void> {
	await page.evaluate(
		({ testId, value }) => {
			const el = document.querySelector(
				`[data-testid="${testId}"]`,
			) as HTMLInputElement | null;
			if (!el) throw new Error(`Slider not found: ${testId}`);
			const setter = Object.getOwnPropertyDescriptor(
				HTMLInputElement.prototype,
				"value",
			)?.set;
			if (!setter) throw new Error("HTMLInputElement value setter unavailable");
			setter.call(el, value);
			el.dispatchEvent(new Event("input", { bubbles: true }));
			el.dispatchEvent(new Event("change", { bubbles: true }));
		},
		{ testId, value },
	);
}
