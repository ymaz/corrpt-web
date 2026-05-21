import { registerEffect } from "@/effects/registry";
import vertexShader from "@/effects/shaders/common/passthrough.vert";
import fragmentShader from "@/effects/shaders/dither/fragment.glsl";
import type { EffectDefinition } from "@/effects/types";

const dither: EffectDefinition = {
	id: "dither",
	name: "Lo-Fi Dither",
	category: "aesthetic",
	description:
		"Pixelated 4-tone palette with Bayer ordered dithering. Hue-controllable palette for lo-fi posterized looks.",
	shortDescription: "pixel posterize",
	parameters: [
		{
			name: "pixelSize",
			type: "float",
			default: 4,
			min: 1,
			max: 16,
			step: 0.5,
			label: "Pixel Size",
		},
		{
			name: "dither",
			type: "float",
			default: 0.7,
			min: 0,
			max: 1,
			step: 0.01,
			label: "Dither",
		},
		{
			name: "contrast",
			type: "float",
			default: 1.3,
			min: 0.5,
			max: 2.5,
			step: 0.05,
			label: "Contrast",
		},
		{
			name: "hue",
			type: "float",
			default: 0.85,
			min: 0,
			max: 1,
			step: 0.01,
			label: "Hue",
		},
		{
			name: "hueShift",
			type: "float",
			default: 0.67,
			min: 0,
			max: 1,
			step: 0.01,
			label: "Hue Shift",
		},
		{
			name: "saturation",
			type: "float",
			default: 1.0,
			min: 0,
			max: 1.5,
			step: 0.01,
			label: "Saturation",
		},
		{
			name: "intensity",
			type: "float",
			default: 1.0,
			min: 0,
			max: 1,
			step: 0.01,
			label: "Intensity",
		},
	],
	vertexShader,
	fragmentShader,
};

registerEffect(dither);
