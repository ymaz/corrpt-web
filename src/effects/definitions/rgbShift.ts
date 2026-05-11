import { registerEffect } from "@/effects/registry";
import vertexShader from "@/effects/shaders/common/passthrough.vert";
import fragmentShader from "@/effects/shaders/rgb-shift/fragment.glsl";
import type { EffectDefinition } from "@/effects/types";

const rgbShift: EffectDefinition = {
	id: "rgbShift",
	name: "RGB Shift",
	category: "color",
	description: "Separates RGB channels and offsets them directionally.",
	shortDescription: "hardware aberration",
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
	],
	vertexShader,
	fragmentShader,
};

registerEffect(rgbShift);
