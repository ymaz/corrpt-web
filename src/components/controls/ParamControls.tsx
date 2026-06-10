import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown } from "lucide-react";
import { type ComponentType, memo, useCallback } from "react";

import type { EffectParameterDef, EffectParameterValue } from "@/effects/types";
import { cn } from "@/lib/cn";
import {
	paramBool,
	paramColor,
	paramEnum,
	paramInt,
	paramSlider,
	paramValue,
	paramVec2,
} from "@/lib/test-ids";

interface ParamProps {
	instanceId: string;
	param: EffectParameterDef;
	value: EffectParameterValue;
	onChange: (value: EffectParameterValue) => void;
}

function BoolParam({ instanceId, param, value, onChange }: ParamProps) {
	return (
		<label className="mb-2 flex items-center gap-2 text-white/80">
			<input
				data-testid={paramBool(instanceId, param.name)}
				type="checkbox"
				className="accent-fuchsia-500"
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
		<div className="mb-2">
			<div className="mb-1 flex justify-between text-white/80">
				<span>{param.label}</span>
				<span
					data-testid={paramValue(instanceId, param.name)}
					className="tabular-nums text-white/50"
				>
					{(value as number).toFixed(2)}
				</span>
			</div>
			<input
				data-testid={paramSlider(instanceId, param.name)}
				type="range"
				className="w-full accent-fuchsia-500"
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
		<div className="mb-2">
			<div className="mb-1 flex justify-between text-white/80">
				<span>{param.label}</span>
				<span
					data-testid={paramValue(instanceId, param.name)}
					className="tabular-nums text-white/50"
				>
					{value as number}
				</span>
			</div>
			<input
				data-testid={paramInt(instanceId, param.name)}
				type="range"
				className="w-full accent-fuchsia-500"
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
	const current = param.options.find((o) => o.value === value);
	return (
		<div className="mb-2">
			<div className="mb-1 text-white/80">{param.label}</div>
			<DropdownMenu.Root>
				<DropdownMenu.Trigger
					data-testid={paramEnum(instanceId, param.name)}
					data-value={value as string}
					className="flex w-full items-center justify-between rounded bg-white/10 px-2 py-1 text-left text-white outline-none transition hover:bg-white/15 focus-visible:ring-1 focus-visible:ring-fuchsia-500"
				>
					<span>{current?.label ?? (value as string)}</span>
					<ChevronDown size={14} className="text-white/50" />
				</DropdownMenu.Trigger>
				<DropdownMenu.Portal>
					<DropdownMenu.Content
						sideOffset={4}
						className="z-50 min-w-(--radix-dropdown-menu-trigger-width) rounded-md border border-white/10 bg-neutral-900/95 p-1 text-sm text-white shadow-xl backdrop-blur-sm"
					>
						{param.options.map((opt) => (
							<DropdownMenu.Item
								key={opt.value}
								data-testid={`${paramEnum(instanceId, param.name)}-option-${opt.value}`}
								className="flex cursor-pointer items-center justify-between rounded px-2 py-1 outline-none data-highlighted:bg-fuchsia-500/30"
								onSelect={() => onChange(opt.value)}
							>
								{opt.label}
								{opt.value === value && <Check size={14} />}
							</DropdownMenu.Item>
						))}
					</DropdownMenu.Content>
				</DropdownMenu.Portal>
			</DropdownMenu.Root>
		</div>
	);
}

function Vec2Param({ instanceId, param, value, onChange }: ParamProps) {
	if (param.type !== "vec2") return null;
	const v = value as [number, number];
	return (
		<div className="mb-2">
			<div className="mb-1 text-white/80">{param.label}</div>
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
	const channels = ["R", "G", "B"] as const;
	const suffixes = ["-r", "-g", "-b"] as const;
	return (
		<div className="mb-2">
			<div className="mb-1 text-white/80">{param.label}</div>
			<div className="flex gap-2">
				{channels.map((ch, i) => (
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

// Stable onChange per param — memo short-circuits when value doesn't change.
export const ParamRow = memo(function ParamRow({
	instanceId,
	param,
	value,
	className,
	setEffectParam,
}: {
	instanceId: string;
	param: EffectParameterDef;
	value: EffectParameterValue;
	className?: string;
	setEffectParam: (
		instanceId: string,
		paramName: string,
		value: EffectParameterValue,
	) => void;
}) {
	const onChange = useCallback(
		(v: EffectParameterValue) => setEffectParam(instanceId, param.name, v),
		[instanceId, param.name, setEffectParam],
	);
	const Component = PARAM_COMPONENTS[param.type];
	return (
		<div className={cn(className)}>
			<Component
				instanceId={instanceId}
				param={param}
				value={value}
				onChange={onChange}
			/>
		</div>
	);
});
