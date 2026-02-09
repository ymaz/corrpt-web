import { useMemo } from "react";

import { getAllEffects } from "@/effects/registry";
import type { EffectParameterDef, EffectParameterValue } from "@/effects/types";
import {
	EFFECT_DEV_PANEL,
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
	effectId: string;
	param: EffectParameterDef;
	value: EffectParameterValue;
	onChange: (value: EffectParameterValue) => void;
}

function BoolParam({ effectId, param, value, onChange }: ParamProps) {
	return (
		<label className="mb-2 flex items-center gap-2 pl-4">
			<input
				data-testid={paramBool(effectId, param.name)}
				type="checkbox"
				checked={value === true || value === 1}
				onChange={(e) => onChange(e.target.checked)}
			/>
			{param.label}
		</label>
	);
}

function FloatParam({ effectId, param, value, onChange }: ParamProps) {
	if (param.type !== "float") return null;
	return (
		<div className="mb-2 pl-4">
			<div className="mb-1 flex justify-between">
				<span>{param.label}</span>
				<span
					data-testid={paramValue(effectId, param.name)}
					className="tabular-nums text-white/60"
				>
					{(value as number).toFixed(2)}
				</span>
			</div>
			<input
				data-testid={paramSlider(effectId, param.name)}
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

function IntParam({ effectId, param, value, onChange }: ParamProps) {
	if (param.type !== "int") return null;
	return (
		<div className="mb-2 pl-4">
			<div className="mb-1 flex justify-between">
				<span>{param.label}</span>
				<span
					data-testid={paramValue(effectId, param.name)}
					className="tabular-nums text-white/60"
				>
					{value as number}
				</span>
			</div>
			<input
				data-testid={paramInt(effectId, param.name)}
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

function EnumParam({ effectId, param, value, onChange }: ParamProps) {
	if (param.type !== "enum") return null;
	return (
		<div className="mb-2 pl-4">
			<div className="mb-1">
				<span>{param.label}</span>
			</div>
			<select
				data-testid={paramEnum(effectId, param.name)}
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

function Vec2Param({ effectId, param, value, onChange }: ParamProps) {
	if (param.type !== "vec2") return null;
	const v = value as [number, number];
	return (
		<div className="mb-2 pl-4">
			<div className="mb-1">
				<span>{param.label}</span>
			</div>
			<div className="flex gap-2">
				<input
					data-testid={`${paramVec2(effectId, param.name)}-x`}
					type="number"
					className="w-1/2 rounded bg-white/10 px-2 py-1 text-white"
					value={v[0]}
					step={param.step?.[0] ?? 0.01}
					min={param.min?.[0]}
					max={param.max?.[0]}
					onChange={(e) => onChange([Number.parseFloat(e.target.value), v[1]])}
				/>
				<input
					data-testid={`${paramVec2(effectId, param.name)}-y`}
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

function ColorParam({ effectId, param, value, onChange }: ParamProps) {
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
							data-testid={`${paramColor(effectId, param.name)}${suffixes[i]}`}
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
	React.ComponentType<ParamProps>
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
								const Component = PARAM_COMPONENTS[param.type];
								return (
									<Component
										key={param.name}
										effectId={def.id}
										param={param}
										value={values[param.name] ?? param.default}
										onChange={(v) => setEffectParam(def.id, param.name, v)}
									/>
								);
							})}
					</div>
				);
			})}
		</div>
	);
}
