import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
	ChevronDown,
	ChevronRight,
	ChevronUp,
	Copy,
	PanelRightClose,
	PanelRightOpen,
	Plus,
	Redo2,
	Trash2,
	Undo2,
} from "lucide-react";
import { memo, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import { getAllEffects, getEffect } from "@/effects/registry";
import type { EffectDefinition } from "@/effects/types";
import {
	ADD_EFFECT_BUTTON,
	effectAdd,
	LAYERS_COUNT,
	LAYERS_EMPTY,
	LAYERS_PANEL,
	layerDuplicate,
	layerExpand,
	layerItem,
	layerMoveDown,
	layerMoveUp,
	layerRemove,
	layerToggle,
	REDO_BUTTON,
	SIDEBAR,
	SIDEBAR_OPEN,
	SIDEBAR_TOGGLE,
	UNDO_BUTTON,
} from "@/lib/test-ids";
import { MAX_LAYERS, useEffectStore } from "@/store/effectStore";
import { useImageStore } from "@/store/imageStore";
import { useUIStore } from "@/store/uiStore";

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
const LayerRow = memo(function LayerRow({
	instanceId,
	def,
	atLimit,
}: {
	instanceId: string;
	def: EffectDefinition;
	atLimit: boolean;
}) {
	const instance = useEffectStore((s) =>
		s.effects.find((e) => e.instanceId === instanceId),
	);
	const setEffectParam = useEffectStore((s) => s.setEffectParam);
	const removeEffect = useEffectStore((s) => s.removeEffect);
	const duplicateEffect = useEffectStore((s) => s.duplicateEffect);
	const toggleEffect = useEffectStore((s) => s.toggleEffect);
	const reorderEffects = useEffectStore((s) => s.reorderEffects);
	const [expanded, setExpanded] = useState(true);
	// Layers display top = applied last, so the top row is the END of the
	// pipeline array and "move up" means "apply later".
	const { isTop, isBottom } = useEffectStore(
		useShallow((s) => {
			const pos = s.effects.findIndex((e) => e.instanceId === instanceId);
			return { isTop: pos === s.effects.length - 1, isBottom: pos === 0 };
		}),
	);

	if (!instance) return null;

	// direction is visual: -1 = up (later in pipeline), +1 = down (earlier).
	function move(direction: -1 | 1) {
		const order = useEffectStore.getState().effects.map((e) => e.instanceId);
		const from = order.indexOf(instanceId);
		const to = from - direction;
		if (from === -1 || to < 0 || to >= order.length) return;
		[order[from], order[to]] = [order[to], order[from]];
		reorderEffects(order);
	}

	return (
		<div
			data-testid={layerItem(instanceId)}
			data-effect-id={def.id}
			className={`mb-2 rounded-md border border-white/10 p-2 last:mb-0 ${
				instance.enabled ? "" : "opacity-50"
			}`}
		>
			<div className="flex items-center gap-2">
				<input
					data-testid={layerToggle(instanceId)}
					type="checkbox"
					className="accent-fuchsia-500"
					title={instance.enabled ? "Disable layer" : "Enable layer"}
					checked={instance.enabled}
					onChange={() => toggleEffect(instanceId)}
				/>
				<button
					data-testid={layerExpand(instanceId)}
					type="button"
					title={expanded ? "Collapse" : "Expand"}
					onClick={() => setExpanded((e) => !e)}
					className="flex min-w-0 flex-1 items-center gap-1 text-left font-medium text-white/90 hover:text-white"
				>
					{expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
					<span className="truncate">{def.name}</span>
				</button>
				<div className="flex gap-1">
					<IconButton
						testId={layerMoveUp(instanceId)}
						title="Move up (applied later)"
						disabled={isTop}
						onClick={() => move(-1)}
					>
						<ChevronUp size={12} />
					</IconButton>
					<IconButton
						testId={layerMoveDown(instanceId)}
						title="Move down (applied earlier)"
						disabled={isBottom}
						onClick={() => move(1)}
					>
						<ChevronDown size={12} />
					</IconButton>
					<IconButton
						testId={layerDuplicate(instanceId)}
						title={atLimit ? `Max ${MAX_LAYERS} layers` : "Duplicate layer"}
						disabled={atLimit}
						onClick={() => duplicateEffect(instanceId)}
					>
						<Copy size={12} />
					</IconButton>
					<IconButton
						testId={layerRemove(instanceId)}
						title="Delete layer"
						danger
						onClick={() => removeEffect(instanceId)}
					>
						<Trash2 size={12} />
					</IconButton>
				</div>
			</div>

			{expanded && (
				<div className="mt-2 border-t border-white/10 pt-2">
					{def.shortDescription && (
						<p className="mb-2 text-xs italic text-white/40">
							{def.shortDescription}
						</p>
					)}
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
			)}
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
			<div className="flex flex-1 gap-2">
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

// "Add effect" button opening a categorized menu — selecting an item adds a
// layer immediately.
function AddEffectMenu({ atLimit }: { atLimit: boolean }) {
	const addEffect = useEffectStore((s) => s.addEffect);

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

	return (
		<DropdownMenu.Root>
			<DropdownMenu.Trigger
				data-testid={ADD_EFFECT_BUTTON}
				disabled={atLimit}
				title={atLimit ? `Max ${MAX_LAYERS} layers` : "Add an effect layer"}
				className="flex w-full items-center justify-center gap-1.5 rounded bg-fuchsia-600/80 px-2 py-1.5 font-medium text-white outline-none transition hover:bg-fuchsia-600 focus-visible:ring-1 focus-visible:ring-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-40"
			>
				<Plus size={14} />
				Add effect
				<ChevronDown size={14} className="text-white/60" />
			</DropdownMenu.Trigger>
			<DropdownMenu.Portal>
				<DropdownMenu.Content
					sideOffset={4}
					className="z-50 min-w-(--radix-dropdown-menu-trigger-width) rounded-md border border-white/10 bg-neutral-900/95 p-1 text-sm text-white shadow-xl backdrop-blur-sm"
				>
					{grouped.map(({ category, defs }) => (
						<DropdownMenu.Group key={category}>
							<DropdownMenu.Label className="px-2 pt-1.5 pb-0.5 text-xs font-semibold uppercase tracking-wide text-white/40">
								{CATEGORY_LABELS[category]}
							</DropdownMenu.Label>
							{defs.map((def) => (
								<DropdownMenu.Item
									key={def.id}
									data-testid={effectAdd(def.id)}
									title={def.shortDescription}
									className="cursor-pointer rounded px-2 py-1 outline-none data-highlighted:bg-fuchsia-500/30"
									onSelect={() => addEffect(def.id)}
								>
									{def.name}
								</DropdownMenu.Item>
							))}
						</DropdownMenu.Group>
					))}
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu.Root>
	);
}

function LayersSection({ layerKeys }: { layerKeys: string[] }) {
	const atLimit = layerKeys.length >= MAX_LAYERS;

	return (
		<div
			data-testid={LAYERS_PANEL}
			className="flex min-h-0 flex-1 flex-col border-t border-white/10 pt-3"
		>
			<div className="mb-2 flex items-baseline justify-between">
				<h3 className="text-xs font-semibold uppercase tracking-wide text-white/40">
					Layers
				</h3>
				<span data-testid={LAYERS_COUNT} className="text-xs text-white/40">
					{layerKeys.length}/{MAX_LAYERS}
				</span>
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto">
				{layerKeys.length === 0 ? (
					<p
						data-testid={LAYERS_EMPTY}
						className="text-xs italic text-white/40"
					>
						No layers yet — add an effect above.
					</p>
				) : (
					// Photoshop convention: topmost layer is applied last, so render
					// the pipeline array in reverse. New layers appear on top.
					[...layerKeys].reverse().map((key) => {
						const instanceId = key.slice(0, key.lastIndexOf("|"));
						const def = getEffect(key.slice(key.lastIndexOf("|") + 1));
						if (!def) return null;
						return (
							<LayerRow
								key={instanceId}
								instanceId={instanceId}
								def={def}
								atLimit={atLimit}
							/>
						);
					})
				)}
			</div>
		</div>
	);
}

export function Sidebar() {
	const bitmap = useImageStore((s) => s.bitmap);
	const sidebarOpen = useUIStore((s) => s.sidebarOpen);
	const toggleSidebar = useUIStore((s) => s.toggleSidebar);

	// Structural selector — re-renders only on add/remove/reorder, not param
	// changes. String entries compare by value via Object.is; object literals
	// would always fail shallow equality even with identical content.
	const layerKeys = useEffectStore(
		useShallow((s) => s.effects.map((e) => `${e.instanceId}|${e.effectId}`)),
	);

	if (!bitmap) return null;

	if (!sidebarOpen) {
		return (
			<button
				data-testid={SIDEBAR_OPEN}
				type="button"
				title="Show sidebar"
				onClick={toggleSidebar}
				className="fixed top-4 right-4 z-30 rounded-lg bg-black/50 p-2 backdrop-blur-sm transition-colors hover:bg-black/70"
			>
				<PanelRightOpen className="size-5 text-neutral-300" />
			</button>
		);
	}

	return (
		<aside
			data-testid={SIDEBAR}
			className="flex h-full w-80 shrink-0 flex-col gap-3 border-l border-white/10 bg-black/80 p-4 text-sm text-white backdrop-blur-md"
		>
			<div className="flex items-center gap-2">
				<HistoryControls />
				<IconButton
					testId={SIDEBAR_TOGGLE}
					title="Hide sidebar"
					onClick={toggleSidebar}
				>
					<PanelRightClose size={16} />
				</IconButton>
			</div>

			<AddEffectMenu atLimit={layerKeys.length >= MAX_LAYERS} />

			<LayersSection layerKeys={layerKeys} />

			<div className="shrink-0">
				<PresetsSection />
			</div>
		</aside>
	);
}
