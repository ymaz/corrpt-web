import { registerEffect } from "@/effects/registry";
import fragmentShader from "@/effects/shaders/chroma-slice/fragment.glsl";
import vertexShader from "@/effects/shaders/common/passthrough.vert";
import type { EffectDefinition } from "@/effects/types";

const chromaSlice: EffectDefinition = {
	id: "chromaSlice",
	name: "Chroma Slice",
	category: "color",
	description:
		"Divides the image into horizontal bands, each tinted with a palette-driven color.",
	shortDescription: "color bands",
	parameters: [
		{
			name: "bandCount",
			type: "float",
			default: 5,
			min: 3,
			max: 12,
			step: 1,
			label: "Band Count",
		},
		{
			name: "tintStrength",
			type: "float",
			default: 0.75,
			min: 0,
			max: 1,
			step: 0.01,
			label: "Tint Strength",
		},
		{
			name: "paletteMode",
			type: "enum",
			default: "warm",
			options: [
				{ label: "Warm", value: "warm" },
				{ label: "Cool", value: "cool" },
				{ label: "Mono", value: "mono" },
				{ label: "Chaos", value: "chaos" },
			],
			label: "Palette",
		},
		{
			name: "seed",
			type: "float",
			default: 0,
			min: 0,
			max: 1000,
			step: 1,
			label: "Seed",
		},
	],
	vertexShader,
	fragmentShader,
};

registerEffect(chromaSlice);
