import { registerEffect } from "@/effects/registry";
import vertexShader from "@/effects/shaders/common/passthrough.vert";
import fragmentShader from "@/effects/shaders/rgb-shift-v2/fragment.glsl";
import type { EffectDefinition } from "@/effects/types";

const rgbShiftV2: EffectDefinition = {
	id: "rgbShiftV2",
	name: "RGB Shift",
	category: "color",
	description:
		"Aggressive chromatic split — G anchored, R/B offset with per-pixel jitter and per-row banding.",
	shortDescription: "signal corruption",
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
			name: "angle",
			type: "float",
			default: 0.0,
			min: 0,
			max: 6.28,
			step: 0.01,
			label: "Angle",
		},
		{
			name: "jitter",
			type: "float",
			default: 0.0,
			min: 0,
			max: 1,
			step: 0.01,
			label: "Jitter",
		},
		{
			name: "bands",
			type: "float",
			default: 0.0,
			min: 0,
			max: 1,
			step: 0.01,
			label: "Scanline Bands",
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

registerEffect(rgbShiftV2);
