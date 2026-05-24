import path from "node:path";
import { fileURLToPath } from "node:url";

import { CANVAS_ERROR } from "../src/lib/test-ids";
import { expect, test, uploadViaLanding } from "./fixtures";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testImage = path.resolve(__dirname, "test-200x100.png");

// Losing the WebGL context emits a benign browser warning, and routing the loss
// through the error boundary makes React log our own rethrown error to the dev
// console. Both are expected by-design output; tolerate them while still failing
// on any genuinely unexpected console error.
const EXPECTED_CONSOLE_OUTPUT = [
	/context.lost|CONTEXT_LOST/i,
	/Graphics rendering stopped/,
];

test.describe("webgl context loss", () => {
	test("shows the graceful message and does not crash when the context is lost", async ({
		page,
	}) => {
		const unexpectedErrors: string[] = [];
		page.on("console", (msg) => {
			const text = msg.text();
			if (
				msg.type() === "error" &&
				!EXPECTED_CONSOLE_OUTPUT.some((pattern) => pattern.test(text))
			) {
				unexpectedErrors.push(text);
			}
		});
		page.on("pageerror", (err) => {
			const text = err.stack ?? err.message;
			if (!EXPECTED_CONSOLE_OUTPUT.some((pattern) => pattern.test(text))) {
				unexpectedErrors.push(text);
			}
		});

		await page.goto("/");
		await uploadViaLanding(page, testImage);
		await expect(page.locator("canvas")).toBeVisible();

		const dispatched = await page.evaluate(() => {
			const canvas = document.querySelector("canvas");
			if (!canvas) return false;
			const gl =
				canvas.getContext("webgl") ?? canvas.getContext("experimental-webgl");
			if (!gl) return false;
			const ext = (gl as WebGLRenderingContext).getExtension(
				"WEBGL_lose_context",
			);
			if (!ext) return false;
			ext.loseContext();
			return true;
		});
		expect(dispatched).toBe(true);

		const error = page.getByTestId(CANVAS_ERROR);
		await expect(error).toBeVisible();
		await expect(error).toContainText("Graphics rendering stopped");
		await expect(error.getByRole("button", { name: "Reload" })).toBeVisible();

		expect(unexpectedErrors).toEqual([]);
	});
});
