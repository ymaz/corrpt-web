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
 * Registers and activates a throwaway effect that exercises the multi-pass and
 * auxiliary-texture engine paths (no shipped effect uses them yet): a first pass
 * maps luminance through a createDataTexture LUT (u_lut), and a second pass
 * composites that result back over the effect's original input (u_source).
 * Drives those paths through real WebGL via the dev-only `__corrpt` seam.
 */
export async function activateMultiPassAuxFixture(page: Page): Promise<void> {
	await page.evaluate(() => {
		const seam = (
			window as unknown as {
				__corrpt: {
					passthroughVert: string;
					registerEffect: (def: unknown) => void;
					addEffect: (id: string) => void;
				};
			}
		).__corrpt;

		const lut = new Uint8Array(256 * 4);
		for (let i = 0; i < 256; i++) {
			const o = i * 4;
			lut[o] = i;
			lut[o + 1] = 255 - i;
			lut[o + 2] = 128;
			lut[o + 3] = 255;
		}

		const id = "__test_multipass_aux";
		seam.registerEffect({
			id,
			name: "Test MultiPass Aux",
			category: "aesthetic",
			description: "",
			parameters: [],
			textures: [
				{ name: "lut", width: 256, height: 1, data: lut, filter: "linear" },
			],
			vertexShader: seam.passthroughVert,
			fragmentShader: "",
			passes: [
				{
					fragmentShader:
						"uniform sampler2D u_texture;uniform sampler2D u_lut;varying vec2 vUv;void main(){vec3 c=texture2D(u_texture,vUv).rgb;float l=dot(c,vec3(0.299,0.587,0.114));gl_FragColor=vec4(texture2D(u_lut,vec2(l,0.5)).rgb,1.0);}",
				},
				{
					fragmentShader:
						"uniform sampler2D u_texture;uniform sampler2D u_source;varying vec2 vUv;void main(){vec3 m=texture2D(u_texture,vUv).rgb;vec3 s=texture2D(u_source,vUv).rgb;gl_FragColor=vec4(mix(s,m,0.5),1.0);}",
				},
			],
		});
		seam.addEffect(id);
	});
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
