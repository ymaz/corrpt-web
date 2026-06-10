import * as Tooltip from "@radix-ui/react-tooltip";
import {
	ChevronDown,
	ChevronUp,
	Copy,
	Redo2,
	Trash2,
	Undo2,
} from "lucide-react";
import { memo, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";

import { getAllEffects } from "@/effects/registry";
import type { EffectDefinition } from "@/effects/types";
import {
	EFFECT_DEV_PANEL,
	effectDuplicate,
	effectInstance,
	effectMoveDown,
	effectMoveUp,
	effectRemove,
	effectSection,
	effectToggle,
	REDO_BUTTON,
	UNDO_BUTTON,
} from "@/lib/test-ids";
import { MAX_EFFECT_INSTANCES, useEffectStore } from "@/store/effectStore";
import { useImageStore } from "@/store/imageStore";

import { ParamRow } from "./ParamControls";
import { PresetsSection } from "./PresetsSection";

const CATEGORY_LABELS: Record<EffectDefinition["category"], string> = {
	distortion: "Distortion",
	color: "Color",
	noise: "Noise",
	aesthetic: "Aesthetic",
};
const CATEGORY_ORDER: EffectDefinition["category"][] = [
	"distortion",
	"color",
	"noise",
	"aesthetic",
];

function IconButton({
	testId,
	title,
	disabled,
	danger,
	onClick,
	children,
}: {
	testId: string;
	title: string;
	disabled?: boolean;
	danger?: boolean;
	onClick: () => void;
	children: React.ReactNode;
}) {
	return (
		<button
			data-testid={testId}
			type="button"
			disabled={disabled}
			title={title}
			onClick={onClick}
			className={`rounded bg-white/10 p-1.5 text-white/70 transition disabled:cursor-not-allowed disabled:opacity-30 ${
				danger ? "hover:bg-red-500/40" : "hover:bg-white/20"
			}`}
		>
			{children}
		</button>
	);
}

// Subscribes only to its own instance — re-renders when its params change, not
// when siblings do. memo prevents cascades when the parent re-renders on
// add/remove/reorder.
const EffectInstanceBlock = memo(function EffectInstanceBlock({
	instanceId,
	def,
	index,
	atLimit,
}: {
	instanceId: string;
	def: EffectDefinition;
	index: number;
	atLimit: boolean;
}) {
	const instance = useEffectStore((s) =>
		s.effects.find((e) => e.instanceId === instanceId),
	);
	const setEffectParam = useEffectStore((s) => s.setEffectParam);
	const removeEffect = useEffectStore((s) => s.removeEffect);
	const duplicateEffect = useEffectStore((s) => s.duplicateEffect);
	const reorderEffects = useEffectStore((s) => s.reorderEffects);
	// Global stack position drives move-button enablement: reorder operates on the
	// full stack, not just same-effect instances.
	const { isFirst, isLast } = useEffectStore(
		useShallow((s) => {
			const pos = s.effects.findIndex((e) => e.instanceId === instanceId);
			return { isFirst: pos === 0, isLast: pos === s.effects.length - 1 };
		}),
	);

	if (!instance) return null;

	function move(direction: -1 | 1) {
		const order = useEffectStore.getState().effects.map((e) => e.instanceId);
		const from = order.indexOf(instanceId);
		const to = from + direction;
		if (from === -1 || to < 0 || to >= order.length) return;
		[order[from], order[to]] = [order[to], order[from]];
		reorderEffects(order);
	}

	return (
		<div
			data-testid={effectInstance(instanceId)}
			className="mb-3 rounded-md border border-white/10 p-3 last:mb-0"
		>
			<div className="mb-2 flex items-center justify-between gap-2">
				<span className="text-xs font-medium text-white/50">
					Instance {index + 1}
				</span>
				<div className="flex gap-1">
					<IconButton
						testId={effectMoveUp(instanceId)}
						title="Move up"
						disabled={isFirst}
						onClick={() => move(-1)}
					>
						<ChevronUp size={12} />
					</IconButton>
					<IconButton
						testId={effectMoveDown(instanceId)}
						title="Move down"
						disabled={isLast}
						onClick={() => move(1)}
					>
						<ChevronDown size={12} />
					</IconButton>
					<IconButton
						testId={effectDuplicate(instanceId)}
						title={
							atLimit
								? `Max ${MAX_EFFECT_INSTANCES} instances per effect`
								: "Duplicate"
						}
						disabled={atLimit}
						onClick={() => duplicateEffect(instanceId)}
					>
						<Copy size={12} />
					</IconButton>
					<IconButton
						testId={effectRemove(instanceId)}
						title="Remove instance"
						danger
						onClick={() => removeEffect(instanceId)}
					>
						<Trash2 size={12} />
					</IconButton>
				</div>
			</div>

			{def.parameters.map((param) => (
				<ParamRow
					key={param.name}
					instanceId={instanceId}
					param={param}
					value={instance.parameters[param.name] ?? param.default}
					setEffectParam={setEffectParam}
				/>
			))}
		</div>
	);
});

function HistoryControls() {
	const canUndo = useEffectStore((s) => s.canUndo);
	const canRedo = useEffectStore((s) => s.canRedo);
	const undo = useEffectStore((s) => s.undo);
	const redo = useEffectStore((s) => s.redo);

	return (
		<Tooltip.Provider delayDuration={300}>
			<div className="mb-3 flex gap-2">
				<Tooltip.Root>
					<Tooltip.Trigger asChild>
						<button
							data-testid={UNDO_BUTTON}
							type="button"
							disabled={!canUndo}
							onClick={undo}
							className="flex flex-1 items-center justify-center gap-1 rounded bg-white/10 py-1.5 text-white/80 transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30"
						>
							<Undo2 size={14} />
							Undo
						</button>
					</Tooltip.Trigger>
					<Tooltip.Portal>
						<Tooltip.Content className="rounded bg-black px-2 py-1 text-xs text-white shadow">
							Undo (Ctrl/Cmd+Z)
						</Tooltip.Content>
					</Tooltip.Portal>
				</Tooltip.Root>
				<Tooltip.Root>
					<Tooltip.Trigger asChild>
						<button
							data-testid={REDO_BUTTON}
							type="button"
							disabled={!canRedo}
							onClick={redo}
							className="flex flex-1 items-center justify-center gap-1 rounded bg-white/10 py-1.5 text-white/80 transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30"
						>
							<Redo2 size={14} />
							Redo
						</button>
					</Tooltip.Trigger>
					<Tooltip.Portal>
						<Tooltip.Content className="rounded bg-black px-2 py-1 text-xs text-white shadow">
							Redo (Ctrl/Cmd+Shift+Z)
						</Tooltip.Content>
					</Tooltip.Portal>
				</Tooltip.Root>
			</div>
		</Tooltip.Provider>
	);
}

function EffectSection({
	def,
	instanceKeys,
}: {
	def: EffectDefinition;
	instanceKeys: string[];
}) {
	const addEffect = useEffectStore((s) => s.addEffect);
	const removeEffectsByEffectId = useEffectStore(
		(s) => s.removeEffectsByEffectId,
	);

	const isActive = instanceKeys.length > 0;
	const atLimit = instanceKeys.length >= MAX_EFFECT_INSTANCES;

	return (
		<div data-testid={effectSection(def.id)} className="mb-3 last:mb-0">
			<label className="flex items-center gap-2 font-medium text-white/90">
				<input
					data-testid={effectToggle(def.id)}
					type="checkbox"
					className="accent-fuchsia-500"
					checked={isActive}
					onChange={(e) => {
						if (e.target.checked) addEffect(def.id);
						else removeEffectsByEffectId(def.id);
					}}
				/>
				{def.name}
			</label>

			{isActive && def.shortDescription && (
				<p className="mt-1 mb-2 pl-6 text-xs italic text-white/40">
					{def.shortDescription}
				</p>
			)}

			{isActive && (
				<div className="mt-2">
					{instanceKeys.map((instanceId, index) => (
						<EffectInstanceBlock
							key={instanceId}
							instanceId={instanceId}
							def={def}
							index={index}
							atLimit={atLimit}
						/>
					))}
				</div>
			)}
		</div>
	);
}

export function EffectsPanel() {
	const bitmap = useImageStore((s) => s.bitmap);

	// Structural selector — re-renders only on add/remove/reorder, not param
	// changes. String entries compare by value via Object.is; object literals
	// would always fail shallow equality even with identical content.
	const effectKeys = useEffectStore(
		useShallow((s) => s.effects.map((e) => `${e.instanceId}|${e.effectId}`)),
	);

	const grouped = useMemo(() => {
		const defs = getAllEffects().filter((e) => e.id !== "passthrough");
		const byCategory = new Map<
			EffectDefinition["category"],
			EffectDefinition[]
		>();
		for (const def of defs) {
			const list = byCategory.get(def.category) ?? [];
			list.push(def);
			byCategory.set(def.category, list);
		}
		return CATEGORY_ORDER.filter((c) => byCategory.has(c)).map((category) => ({
			category,
			defs: byCategory.get(category) as EffectDefinition[],
		}));
	}, []);

	if (!bitmap) return null;

	return (
		<div
			data-testid={EFFECT_DEV_PANEL}
			className="fixed bottom-4 right-4 z-30 flex max-h-[85vh] w-72 flex-col overflow-y-auto rounded-lg border border-white/10 bg-black/80 p-4 text-sm text-white backdrop-blur-md"
		>
			<HistoryControls />

			{grouped.map(({ category, defs }) => (
				<div key={category} className="mb-4 last:mb-0">
					<h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/40">
						{CATEGORY_LABELS[category]}
					</h3>
					{defs.map((def) => (
						<EffectSection
							key={def.id}
							def={def}
							instanceKeys={effectKeys
								.filter((k) => k.endsWith(`|${def.id}`))
								.map((k) => k.slice(0, k.lastIndexOf("|")))}
						/>
					))}
				</div>
			))}

			<PresetsSection />
		</div>
	);
}
