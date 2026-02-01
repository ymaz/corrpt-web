import { useEffect } from "react";

import { getEffect } from "@/effects/registry";
import { useEffectStore } from "@/store/effectStore";
import { useImageStore } from "@/store/imageStore";

const EFFECT_ID = "rgbShift";

export function EffectDevPanel() {
	const texture = useImageStore((s) => s.texture);
	const addEffect = useEffectStore((s) => s.addEffect);
	const removeEffect = useEffectStore((s) => s.removeEffect);
	const parameters = useEffectStore((s) => s.parameters);
	const setEffectParam = useEffectStore((s) => s.setEffectParam);

	useEffect(() => {
		if (texture) {
			addEffect(EFFECT_ID);
			return () => removeEffect(EFFECT_ID);
		}
	}, [texture, addEffect, removeEffect]);

	if (!texture) return null;

	const def = getEffect(EFFECT_ID);
	if (!def) return null;

	const values = parameters[EFFECT_ID] ?? {};

	return (
		<div className="fixed bottom-4 right-4 z-50 w-64 rounded-lg bg-black/80 p-4 text-sm text-white backdrop-blur-sm">
			<h3 className="mb-3 font-semibold">{def.name}</h3>
			{def.parameters.map((param) => {
				const value = values[param.name] ?? param.default;

				if (param.type === "bool") {
					return (
						<label key={param.name} className="mb-2 flex items-center gap-2">
							<input
								type="checkbox"
								checked={value === true || value === 1}
								onChange={(e) =>
									setEffectParam(EFFECT_ID, param.name, e.target.checked)
								}
							/>
							{param.label}
						</label>
					);
				}

				return (
					<div key={param.name} className="mb-2">
						<div className="mb-1 flex justify-between">
							<span>{param.label}</span>
							<span className="tabular-nums text-white/60">
								{typeof value === "number" ? value.toFixed(2) : value}
							</span>
						</div>
						<input
							type="range"
							className="w-full"
							min={param.min}
							max={param.max}
							step={param.step}
							value={typeof value === "number" ? value : 0}
							onChange={(e) =>
								setEffectParam(
									EFFECT_ID,
									param.name,
									Number.parseFloat(e.target.value),
								)
							}
						/>
					</div>
				);
			})}
		</div>
	);
}
