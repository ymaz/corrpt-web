import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Slider from "@radix-ui/react-slider";
import { ChevronDown, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import { MIME_TO_EXT } from "@/lib/constants";
import { exportImage } from "@/lib/exportImage";
import {
	EXPORT_CANCEL_BUTTON,
	EXPORT_CONFIRM_BUTTON,
	EXPORT_DIALOG,
	EXPORT_FORMAT_SELECT,
	EXPORT_QUALITY_SLIDER,
	EXPORT_QUALITY_VALUE,
} from "@/lib/test-ids";
import { getTime, useEffectStore } from "@/store/effectStore";
import { useImageStore } from "@/store/imageStore";
import { useUIStore } from "@/store/uiStore";

const FORMAT_OPTIONS = Object.entries(MIME_TO_EXT).map(([mime, ext]) => ({
	mime,
	label: ext.toUpperCase(),
}));

function isLossy(mime: string): boolean {
	return mime === "image/jpeg" || mime === "image/webp";
}

export function ExportDialog() {
	const open = useUIStore((s) => s.activeModal === "export");
	const closeModal = useUIStore((s) => s.closeModal);

	const { bitmap, dimensions, fileName, mimeType } = useImageStore(
		useShallow((s) => ({
			bitmap: s.bitmap,
			dimensions: s.dimensions,
			fileName: s.fileName,
			mimeType: s.mimeType,
		})),
	);
	const effects = useEffectStore((s) => s.effects);

	const [format, setFormat] = useState(mimeType ?? "image/png");
	const [quality, setQuality] = useState(0.92);
	const [isExporting, setIsExporting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Default the format to the source image's type each time the dialog opens.
	useEffect(() => {
		if (open && mimeType && MIME_TO_EXT[mimeType]) {
			setFormat(mimeType);
			setError(null);
		}
	}, [open, mimeType]);

	const currentLabel = useMemo(
		() => FORMAT_OPTIONS.find((o) => o.mime === format)?.label ?? "PNG",
		[format],
	);

	const handleConfirm = useCallback(() => {
		if (!bitmap || !dimensions || !fileName) return;
		setError(null);
		setIsExporting(true);
		const time = getTime();
		setTimeout(async () => {
			try {
				await exportImage({
					bitmap,
					dimensions,
					effects,
					mimeType: format,
					fileName,
					time,
					quality: isLossy(format) ? quality : undefined,
				});
				setIsExporting(false);
				closeModal();
			} catch {
				setIsExporting(false);
				setError("Failed to export image. Try again.");
			}
		}, 0);
	}, [bitmap, dimensions, fileName, effects, format, quality, closeModal]);

	return (
		<Dialog.Root
			open={open}
			onOpenChange={(next) => {
				if (!next) closeModal();
			}}
		>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
				<Dialog.Content
					data-testid={EXPORT_DIALOG}
					className="fixed left-1/2 top-1/2 z-50 w-[min(90vw,24rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-white/10 bg-neutral-900 p-5 text-sm text-white shadow-2xl"
				>
					<div className="mb-4 flex items-center justify-between">
						<Dialog.Title className="text-base font-semibold">
							Export image
						</Dialog.Title>
						<Dialog.Close
							className="rounded p-1 text-white/60 hover:bg-white/10 hover:text-white"
							aria-label="Close"
						>
							<X size={16} />
						</Dialog.Close>
					</div>
					<Dialog.Description className="sr-only">
						Choose an output format and quality, then export the rendered image.
					</Dialog.Description>

					<div className="mb-4">
						<div className="mb-1 text-white/70">Format</div>
						<DropdownMenu.Root>
							<DropdownMenu.Trigger
								data-testid={EXPORT_FORMAT_SELECT}
								data-value={format}
								className="flex w-full items-center justify-between rounded bg-white/10 px-3 py-2 text-left outline-none transition hover:bg-white/15"
							>
								<span>{currentLabel}</span>
								<ChevronDown size={14} className="text-white/50" />
							</DropdownMenu.Trigger>
							<DropdownMenu.Portal>
								<DropdownMenu.Content
									sideOffset={4}
									className="z-50 min-w-(--radix-dropdown-menu-trigger-width) rounded-md border border-white/10 bg-neutral-800 p-1 shadow-xl"
								>
									{FORMAT_OPTIONS.map((opt) => (
										<DropdownMenu.Item
											key={opt.mime}
											data-testid={`${EXPORT_FORMAT_SELECT}-option-${opt.label}`}
											className="cursor-pointer rounded px-3 py-1.5 outline-none data-highlighted:bg-fuchsia-500/30"
											onSelect={() => setFormat(opt.mime)}
										>
											{opt.label}
										</DropdownMenu.Item>
									))}
								</DropdownMenu.Content>
							</DropdownMenu.Portal>
						</DropdownMenu.Root>
					</div>

					{isLossy(format) && (
						<div className="mb-4">
							<div className="mb-1 flex justify-between text-white/70">
								<span>Quality</span>
								<span
									data-testid={EXPORT_QUALITY_VALUE}
									className="tabular-nums text-white/50"
								>
									{quality.toFixed(2)}
								</span>
							</div>
							<Slider.Root
								data-testid={EXPORT_QUALITY_SLIDER}
								className="relative flex h-5 w-full touch-none items-center"
								min={0.1}
								max={1}
								step={0.01}
								value={[quality]}
								onValueChange={([v]) => setQuality(v)}
							>
								<Slider.Track className="relative h-1 grow rounded-full bg-white/20">
									<Slider.Range className="absolute h-full rounded-full bg-fuchsia-500" />
								</Slider.Track>
								<Slider.Thumb
									className="block size-4 rounded-full bg-white shadow outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400"
									aria-label="Quality"
								/>
							</Slider.Root>
						</div>
					)}

					{error && <p className="mb-3 text-red-400">{error}</p>}

					<div className="flex justify-end gap-2">
						<button
							data-testid={EXPORT_CANCEL_BUTTON}
							type="button"
							className="rounded px-3 py-2 text-white/70 transition hover:bg-white/10"
							onClick={closeModal}
						>
							Cancel
						</button>
						<button
							data-testid={EXPORT_CONFIRM_BUTTON}
							type="button"
							disabled={isExporting || !bitmap}
							className="flex items-center gap-2 rounded bg-fuchsia-600 px-3 py-2 font-medium transition hover:bg-fuchsia-500 disabled:opacity-50"
							onClick={handleConfirm}
						>
							{isExporting && <Loader2 size={14} className="animate-spin" />}
							Export
						</button>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
