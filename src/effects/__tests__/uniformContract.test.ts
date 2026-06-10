// Contract test: every effect's declared parameters must be consumed by its
// shaders, and every `u_` uniform referenced by a shader must be accounted for
// (a parameter, an aux texture, or an engine-provided uniform).
import { describe, expect, it } from "vitest";

import "@/effects/definitions";
import { getAllEffects } from "@/effects/registry";
import type { EffectDefinition } from "@/effects/types";

/** Uniforms bound by the engine itself (see renderEffectChain/reglContext). */
const ENGINE_UNIFORMS = new Set([
	"u_texture",
	"u_resolution",
	"u_time",
	"u_source",
]);

interface ResolvedPass {
	fragmentShader: string;
	vertexShader: string;
}

function resolvePasses(def: EffectDefinition): ResolvedPass[] {
	const source =
		def.passes && def.passes.length > 0
			? def.passes
			: [{ fragmentShader: def.fragmentShader }];
	return source.map((p) => ({
		fragmentShader: p.fragmentShader,
		vertexShader: ("vertexShader" in p && p.vertexShader) || def.vertexShader,
	}));
}

function passSources(def: EffectDefinition): string[] {
	return resolvePasses(def).map(
		(p) => `${p.fragmentShader}\n${p.vertexShader}`,
	);
}

const effects = getAllEffects().map((def) => ({ id: def.id, def }));

describe("uniform/param contract", () => {
	it("registry is not empty", () => {
		expect(effects.length).toBeGreaterThan(0);
	});

	describe.each(effects)("$id", ({ def }) => {
		const sources = passSources(def);

		it("every declared parameter is referenced as u_<name> in at least one pass", () => {
			for (const p of def.parameters) {
				const uniform = `u_${p.name}`;
				const re = new RegExp(`\\b${uniform}\\b`);
				const used = sources.some((src) => re.test(src));
				expect(
					used,
					`effect "${def.id}": parameter "${p.name}" is never read as ${uniform} in any pass`,
				).toBe(true);
			}
		});

		it("every u_ uniform referenced by a shader is a parameter, aux texture, or engine uniform", () => {
			const known = new Set(ENGINE_UNIFORMS);
			for (const p of def.parameters) known.add(`u_${p.name}`);
			for (const t of def.textures ?? []) known.add(`u_${t.name}`);

			for (const src of sources) {
				const found = src.match(/\bu_[A-Za-z0-9_]+\b/g) ?? [];
				for (const uniform of found) {
					expect(
						known.has(uniform),
						`effect "${def.id}": shader references "${uniform}" which is not a declared parameter, aux texture, or engine uniform`,
					).toBe(true);
				}
			}
		});
	});
});
