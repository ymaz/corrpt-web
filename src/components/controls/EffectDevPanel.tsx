import { useMemo } from "react";

import { getAllEffects } from "@/effects/registry";
import {
	EFFECT_DEV_PANEL,
	effectSection,
	effectToggle,
	paramBool,
	paramSlider,
	paramValue,
} from "@/lib/test-ids";
import { useEffectStore } from "@/store/effectStore";
import { useImageStore } from "@/store/imageStore";

export function EffectDevPanel() {
	const texture = useImageStore((s) => s.texture);
	const activeEffects = useEffectStore((s) => s.activeEffects);
	const addEffect = useEffectStore((s) => s.addEffect);
	const removeEffect = useEffectStore((s) => s.removeEffect);
	const parameters = useEffectStore((s) => s.parameters);
	const setEffectParam = useEffectStore((s) => s.setEffectParam);

	const effects = useMemo(
		() => getAllEffects().filter((e) => e.id !== "passthrough"),
		[],
	);

	if (!texture) return null;

	return (
		<div
			data-testid={EFFECT_DEV_PANEL}
			className="fixed bottom-4 right-4 z-50 w-64 max-h-[80vh] overflow-y-auto rounded-lg bg-black/80 p-4 text-sm text-white backdrop-blur-sm"
		>
			{effects.map((def) => {
				const isActive = activeEffects.includes(def.id);
				const values = parameters[def.id] ?? {};

				return (
					<div
						key={def.id}
						data-testid={effectSection(def.id)}
						className="mb-4 last:mb-0"
					>
						<label className="mb-2 flex items-center gap-2 font-semibold">
							<input
								data-testid={effectToggle(def.id)}
								type="checkbox"
								checked={isActive}
								onChange={(e) => {
									if (e.target.checked) {
										addEffect(def.id);
									} else {
										removeEffect(def.id);
									}
								}}
							/>
							{def.name}
						</label>

						{isActive &&
							def.parameters.map((param) => {
								const value = values[param.name] ?? param.default;

								if (param.type === "bool") {
									return (
										<label
											key={param.name}
											className="mb-2 flex items-center gap-2 pl-4"
										>
											<input
												data-testid={paramBool(def.id, param.name)}
												type="checkbox"
												checked={value === true || value === 1}
												onChange={(e) =>
													setEffectParam(def.id, param.name, e.target.checked)
												}
											/>
											{param.label}
										</label>
									);
								}

								return (
									<div key={param.name} className="mb-2 pl-4">
										<div className="mb-1 flex justify-between">
											<span>{param.label}</span>
											<span
												data-testid={paramValue(def.id, param.name)}
												className="tabular-nums text-white/60"
											>
												{typeof value === "number" ? value.toFixed(2) : value}
											</span>
										</div>
										<input
											data-testid={paramSlider(def.id, param.name)}
											type="range"
											className="w-full"
											min={param.min}
											max={param.max}
											step={param.step}
											value={typeof value === "number" ? value : 0}
											onChange={(e) =>
												setEffectParam(
													def.id,
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
			})}
		</div>
	);
}
