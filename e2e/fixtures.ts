import { test as base, expect, type Page } from "@playwright/test";

import {
	effectSection,
	LANDING_FILE_INPUT,
	REPLACE_FILE_INPUT,
} from "../src/lib/test-ids";

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

export async function getEffectInstanceIds(
	page: Page,
	effectId: string,
): Promise<string[]> {
	const prefix = "effect-instance-";
	const container = page.getByTestId(effectSection(effectId));
	const instances = container.locator(`[data-testid^="${prefix}"]`);
	if ((await instances.count()) === 0) {
		throw new Error(`No instances found for effect: ${effectId}`);
	}
	return instances.evaluateAll(
		(elements, prefix) =>
			elements.map((element) => {
				const testId = element.getAttribute("data-testid");
				if (!testId?.startsWith(prefix)) {
					throw new Error(`Effect instance test id not found: ${testId}`);
				}
				return testId.slice(prefix.length);
			}),
		prefix,
	);
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
