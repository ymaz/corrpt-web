import { chromium } from "playwright";

/**
 * Launch a headless Chromium browser and create a page with console error tracking.
 * @param {{width: number, height: number}} [viewport={width: 1280, height: 720}]
 * @returns {Promise<{browser: import('playwright').Browser, page: import('playwright').Page, consoleErrors: string[]}>}
 */
export async function createBrowser(viewport = { width: 1280, height: 720 }) {
	const browser = await chromium.launch({ headless: true });
	const page = await browser.newPage({ viewport });

	const consoleErrors = [];
	page.on("console", (msg) => {
		if (msg.type() === "error") consoleErrors.push(msg.text());
	});

	return { browser, page, consoleErrors };
}

/**
 * Close the browser instance.
 * @param {{browser: import('playwright').Browser}} ctx
 */
export async function closeBrowser(ctx) {
	await ctx.browser.close();
}
