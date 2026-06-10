import { registerEffect } from "@/effects/registry";
import vertexShader from "@/effects/shaders/common/passthrough.vert";
import fragmentShader from "@/effects/shaders/noise-v2/fragment.glsl";
import type { EffectDefinition } from "@/effects/types";

const noiseV2: EffectDefinition = {
	id: "noiseV2",
	name: "Noise",
	category: "noise",
	description:
		"Film grain — Gaussian-distributed smooth grain with midtone-peaked luma response and frame-animated texture.",
	shortDescription: "film grain",
	parameters: [
		{
			name: "intensity",
			type: "float",
			default: 0.2,
			min: 0,
			max: 1,
			step: 0.01,
			label: "Intensity",
		},
		{
			name: "size",
			type: "float",
			default: 1.5,
			min: 1,
			max: 8,
			step: 0.5,
			label: "Grain Size",
		},
		{
			name: "speed",
			type: "float",
			default: 0.5,
			min: 0,
			max: 1,
			step: 0.01,
			label: "Speed",
		},
		{
			name: "seed",
			type: "float",
			default: 0,
			min: 0,
			max: 99,
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

registerEffect(noiseV2);
