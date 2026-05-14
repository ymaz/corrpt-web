import { registerEffect } from "@/effects/registry";
import fragmentShader from "@/effects/shaders/block-glitch/fragment.glsl";
import vertexShader from "@/effects/shaders/common/passthrough.vert";
import type { EffectDefinition } from "@/effects/types";

const blockGlitch: EffectDefinition = {
	id: "blockGlitch",
	name: "Macroblock",
	category: "distortion",
	description: "Grid-based block displacement — codec macroblock corruption.",
	shortDescription: "block corrupt",
	parameters: [
		{
			name: "intensity",
			type: "float",
			default: 0.5,
			min: 0,
			max: 1,
			step: 0.01,
			label: "Intensity",
		},
		{
			name: "gridSizeX",
			type: "float",
			default: 12,
			min: 2,
			max: 32,
			step: 1,
			label: "Grid X",
		},
		{
			name: "gridSizeY",
			type: "float",
			default: 20,
			min: 4,
			max: 64,
			step: 1,
			label: "Grid Y",
		},
		{
			name: "threshold",
			type: "float",
			default: 0.3,
			min: 0,
			max: 1,
			step: 0.01,
			label: "Threshold",
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

registerEffect(blockGlitch);
