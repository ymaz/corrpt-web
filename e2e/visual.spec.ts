import path from "node:path";
import { fileURLToPath } from "node:url";

import { PNG } from "pngjs";

import { EFFECT_DEV_PANEL, effectToggle } from "../src/lib/test-ids";
import { expect, test, uploadViaLanding } from "./fixtures";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testImage = path.resolve(__dirname, "test-200x100.png");

const BG_RGB = [26, 26, 26] as const; // #1a1a1a
const COLOR_TOL = 4;

function isBackground(rgb: readonly [number, number, number]): boolean {
	return (
		Math.abs(rgb[0] - BG_RGB[0]) <= COLOR_TOL &&
		Math.abs(rgb[1] - BG_RGB[1]) <= COLOR_TOL &&
		Math.abs(rgb[2] - BG_RGB[2]) <= COLOR_TOL
	);
}

function pixelAt(png: PNG, x: number, y: number): [number, number, number] {
	const idx = (png.width * y + x) << 2;
	return [png.data[idx], png.data[idx + 1], png.data[idx + 2]];
}

function maxChannelDelta(
	a: readonly [number, number, number],
	b: readonly [number, number, number],
): number {
	return Math.max(
		Math.abs(a[0] - b[0]),
		Math.abs(a[1] - b[1]),
		Math.abs(a[2] - b[2]),
	);
}

// Sample center + left/right midline. The 1/4 inset keeps these inside the
// image rect for any aspect-fit; left vs right of the test gradient image
// must differ noticeably when rendering works.
async function samplePixels(page: import("@playwright/test").Page): Promise<{
	width: number;
	height: number;
	center: [number, number, number];
	left: [number, number, number];
	right: [number, number, number];
}> {
	const buf = await page.locator("canvas").screenshot();
	const png = PNG.sync.read(buf);
	const w = png.width;
	const h = png.height;
	return {
		width: w,
		height: h,
		center: pixelAt(png, w >> 1, h >> 1),
		left: pixelAt(png, w >> 2, h >> 1),
		right: pixelAt(png, (3 * w) >> 2, h >> 1),
	};
}

test.describe("visual", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		await uploadViaLanding(page, testImage);
		await expect(page.getByTestId(EFFECT_DEV_PANEL)).toBeVisible();
		// Wait for the first real frame instead of a fixed delay: the center
		// pixel leaves the background color once the image has rendered.
		await expect
			.poll(async () => isBackground((await samplePixels(page)).center), {
				timeout: 5_000,
			})
			.toBe(false);
	});

	test("image renders with real content — non-background and non-uniform across the canvas", async ({
		page,
		consoleErrors,
	}) => {
		const px = await samplePixels(page);
		// Center must not be background — catches "image rendered in wrong rect"
		// (e.g. the canvas-sizing bug where the image lands in the top-left).
		expect(
			isBackground(px.center),
			`center pixel ${JSON.stringify(px.center)} should not be background ` +
				`(canvas ${px.width}x${px.height})`,
		).toBe(false);
		// Test image is a blue→orange gradient — left and right samples must
		// differ. Catches "canvas is uniform white/black" failures where the
		// final blit reads from an empty FBO instead of the chain output.
		const lrDelta = maxChannelDelta(px.left, px.right);
		expect(
			lrDelta,
			`left ${JSON.stringify(px.left)} and right ${JSON.stringify(px.right)} ` +
				`should differ by >=40 channel units (got ${lrDelta})`,
		).toBeGreaterThanOrEqual(40);
		expect(consoleErrors).toEqual([]);
	});

	test("active effect still produces real, non-uniform output", async ({
		page,
		consoleErrors,
	}) => {
		// Toggling an effect routes draws through the FBO ping-pong before the
		// final blit. If `framebuffer` isn't declared in the regl command config,
		// the effect renders to the canvas directly and the final blit samples
		// empty FBOs, producing a uniform white surface. The variance check
		// catches that regression class.
		await page.getByTestId(effectToggle("rgbShift")).check();

		// Poll the invariant directly: once the effect has rendered, the canvas
		// must still be non-background and non-uniform. The broken FBO-routing
		// case yields a uniform surface (delta 0), so it never satisfies this and
		// fails on timeout. Returning -1 for a background center fails the same
		// assertion, covering the "rendered in wrong rect" case too.
		await expect
			.poll(
				async () => {
					const cur = await samplePixels(page);
					return isBackground(cur.center)
						? -1
						: maxChannelDelta(cur.left, cur.right);
				},
				{ timeout: 5_000 },
			)
			.toBeGreaterThanOrEqual(40);

		expect(consoleErrors).toEqual([]);
	});
});
