import { registerEffect } from "@/effects/registry";
import vertexShader from "@/effects/shaders/common/passthrough.vert";
import fragmentShader from "@/effects/shaders/noise/fragment.glsl";
import type { EffectDefinition } from "@/effects/types";

const noise: EffectDefinition = {
	id: "noise",
	name: "Noise",
	category: "aesthetic",
	description: "Adds film grain or static noise to the image.",
	parameters: [
		{
			name: "intensity",
			type: "float",
			default: 0.15,
			min: 0,
			max: 1,
			step: 0.01,
			label: "Intensity",
		},
		{
			name: "scale",
			type: "float",
			default: 1,
			min: 1,
			max: 100,
			step: 1,
			label: "Scale",
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
		{
			name: "monochrome",
			type: "bool",
			default: true,
			label: "Monochrome",
		},
	],
	vertexShader,
	fragmentShader,
};

registerEffect(noise);
