import { registerEffect } from "@/effects/registry";
import vertexShader from "@/effects/shaders/common/passthrough.vert";
import fragmentShader from "@/effects/shaders/slice-shift/fragment.glsl";
import type { EffectDefinition } from "@/effects/types";

const sliceShift: EffectDefinition = {
	id: "sliceShift",
	name: "Slice Shift",
	category: "distortion",
	description: "Band displacement — classic glitch effect.",
	parameters: [
		{
			name: "intensity",
			type: "float",
			default: 0.1,
			min: 0,
			max: 1,
			step: 0.01,
			label: "Intensity",
		},
		{
			name: "sliceCount",
			type: "float",
			default: 20,
			min: 5,
			max: 100,
			step: 1,
			label: "Slice Count",
		},
		{
			name: "sliceFill",
			type: "float",
			default: 0.5,
			min: 0,
			max: 1,
			step: 0.01,
			label: "Slice Fill",
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
			name: "vertical",
			type: "bool",
			default: false,
			label: "Vertical",
		},
	],
	vertexShader,
	fragmentShader,
};

registerEffect(sliceShift);
