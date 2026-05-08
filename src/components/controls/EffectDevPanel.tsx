import { type ComponentType, useMemo } from "react";

import { getAllEffects } from "@/effects/registry";
import type { EffectParameterDef, EffectParameterValue } from "@/effects/types";
import {
	EFFECT_DEV_PANEL,
	effectDuplicate,
	effectInstance,
	effectRemove,
	effectSection,
	effectToggle,
	paramBool,
	paramColor,
	paramEnum,
	paramInt,
	paramSlider,
	paramValue,
	paramVec2,
} from "@/lib/test-ids";
import { useEffectStore } from "@/store/effectStore";
import { useImageStore } from "@/store/imageStore";

interface ParamProps {
	instanceId: string;
	param: EffectParameterDef;
	value: EffectParameterValue;
	onChange: (value: EffectParameterValue) => void;
}

function BoolParam({ instanceId, param, value, onChange }: ParamProps) {
	return (
		<label className="mb-2 flex items-center gap-2 pl-4">
			<input
				data-testid={paramBool(instanceId, param.name)}
				type="checkbox"
				checked={Boolean(value)}
				onChange={(e) => onChange(e.target.checked)}
			/>
			{param.label}
		</label>
	);
}

function FloatParam({ instanceId, param, value, onChange }: ParamProps) {
	if (param.type !== "float") return null;
	return (
		<div className="mb-2 pl-4">
			<div className="mb-1 flex justify-between">
				<span>{param.label}</span>
				<span
					data-testid={paramValue(instanceId, param.name)}
					className="tabular-nums text-white/60"
				>
					{(value as number).toFixed(2)}
				</span>
			</div>
			<input
				data-testid={paramSlider(instanceId, param.name)}
				type="range"
				className="w-full"
				min={param.min}
				max={param.max}
				step={param.step}
				value={value as number}
				onChange={(e) => onChange(Number.parseFloat(e.target.value))}
			/>
		</div>
	);
}

function IntParam({ instanceId, param, value, onChange }: ParamProps) {
	if (param.type !== "int") return null;
	return (
		<div className="mb-2 pl-4">
			<div className="mb-1 flex justify-between">
				<span>{param.label}</span>
				<span
					data-testid={paramValue(instanceId, param.name)}
					className="tabular-nums text-white/60"
				>
					{value as number}
				</span>
			</div>
			<input
				data-testid={paramInt(instanceId, param.name)}
				type="range"
				className="w-full"
				min={param.min}
				max={param.max}
				step={1}
				value={value as number}
				onChange={(e) => onChange(Number.parseInt(e.target.value, 10))}
			/>
		</div>
	);
}

function EnumParam({ instanceId, param, value, onChange }: ParamProps) {
	if (param.type !== "enum") return null;
	return (
		<div className="mb-2 pl-4">
			<div className="mb-1">
				<span>{param.label}</span>
			</div>
			<select
				data-testid={paramEnum(instanceId, param.name)}
				className="w-full rounded bg-white/10 px-2 py-1 text-white"
				value={value as string}
				onChange={(e) => onChange(e.target.value)}
			>
				{param.options.map((opt) => (
					<option key={opt.value} value={opt.value}>
						{opt.label}
					</option>
				))}
			</select>
		</div>
	);
}

function Vec2Param({ instanceId, param, value, onChange }: ParamProps) {
	if (param.type !== "vec2") return null;
	const v = value as [number, number];
	return (
		<div className="mb-2 pl-4">
			<div className="mb-1">
				<span>{param.label}</span>
			</div>
			<div className="flex gap-2">
				<input
					data-testid={`${paramVec2(instanceId, param.name)}-x`}
					type="number"
					className="w-1/2 rounded bg-white/10 px-2 py-1 text-white"
					value={v[0]}
					step={param.step?.[0] ?? 0.01}
					min={param.min?.[0]}
					max={param.max?.[0]}
					onChange={(e) => onChange([Number.parseFloat(e.target.value), v[1]])}
				/>
				<input
					data-testid={`${paramVec2(instanceId, param.name)}-y`}
					type="number"
					className="w-1/2 rounded bg-white/10 px-2 py-1 text-white"
					value={v[1]}
					step={param.step?.[1] ?? 0.01}
					min={param.min?.[1]}
					max={param.max?.[1]}
					onChange={(e) => onChange([v[0], Number.parseFloat(e.target.value)])}
				/>
			</div>
		</div>
	);
}

function ColorParam({ instanceId, param, value, onChange }: ParamProps) {
	if (param.type !== "color") return null;
	const c = value as [number, number, number];
	const labels = ["R", "G", "B"];
	const suffixes = ["-r", "-g", "-b"];
	return (
		<div className="mb-2 pl-4">
			<div className="mb-1">
				<span>{param.label}</span>
			</div>
			<div className="flex gap-2">
				{labels.map((ch, i) => (
					<div key={ch} className="flex-1">
						<div className="mb-0.5 text-center text-xs text-white/40">{ch}</div>
						<input
							data-testid={`${paramColor(instanceId, param.name)}${suffixes[i]}`}
							type="number"
							className="w-full rounded bg-white/10 px-1 py-1 text-center text-white"
							value={c[i]}
							step={0.01}
							min={0}
							max={1}
							onChange={(e) => {
								const next: [number, number, number] = [...c];
								next[i] = Number.parseFloat(e.target.value);
								onChange(next);
							}}
						/>
					</div>
				))}
			</div>
		</div>
	);
}

const PARAM_COMPONENTS: Record<
	EffectParameterDef["type"],
	ComponentType<ParamProps>
> = {
	bool: BoolParam,
	float: FloatParam,
	int: IntParam,
	enum: EnumParam,
	vec2: Vec2Param,
	color: ColorParam,
};

export function EffectDevPanel() {
	const texture = useImageStore((s) => s.texture);
	const effectInstances = useEffectStore((s) => s.effects);
	const addEffect = useEffectStore((s) => s.addEffect);
	const removeEffect = useEffectStore((s) => s.removeEffect);
	const removeEffectsByEffectId = useEffectStore(
		(s) => s.removeEffectsByEffectId,
	);
	const setEffectParam = useEffectStore((s) => s.setEffectParam);
	const duplicateEffect = useEffectStore((s) => s.duplicateEffect);

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
				const instances = effectInstances.filter(
					(effect) => effect.effectId === def.id,
				);
				const isActive = instances.length > 0;

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
										removeEffectsByEffectId(def.id);
									}
								}}
							/>
							{def.name}
						</label>

						{isActive &&
							instances.map((instance, index) => (
								<div
									key={instance.instanceId}
									data-testid={effectInstance(instance.instanceId)}
									className="mb-3 rounded-md border border-white/10 py-2 pr-2 last:mb-0"
								>
									<div className="mb-2 flex items-center justify-between gap-2 pl-4">
										<span className="text-xs font-medium text-white/50">
											Instance {index + 1}
										</span>
										<div className="flex gap-1">
											<button
												data-testid={effectDuplicate(instance.instanceId)}
												type="button"
												className="rounded bg-white/10 px-2 py-1 text-xs text-white/70 transition hover:bg-white/20"
												onClick={() => duplicateEffect(instance.instanceId)}
											>
												Duplicate
											</button>
											<button
												data-testid={effectRemove(instance.instanceId)}
												type="button"
												className="rounded bg-white/10 px-2 py-1 text-xs text-white/70 transition hover:bg-white/20"
												onClick={() => removeEffect(instance.instanceId)}
											>
												Remove
											</button>
										</div>
									</div>

									{def.parameters.map((param) => {
										const Component = PARAM_COMPONENTS[param.type];
										return (
											<Component
												key={param.name}
												instanceId={instance.instanceId}
												param={param}
												value={instance.parameters[param.name] ?? param.default}
												onChange={(v) =>
													setEffectParam(instance.instanceId, param.name, v)
												}
											/>
										);
									})}
								</div>
							))}
					</div>
				);
			})}
		</div>
	);
}
