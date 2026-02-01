import { Component, type ReactNode } from "react";

interface Props {
	children: ReactNode;
	resetKey?: string | null;
}

interface State {
	hasError: boolean;
	error: Error | null;
}

export class CanvasErrorBoundary extends Component<Props, State> {
	state: State = { hasError: false, error: null };

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	componentDidUpdate(prevProps: Props) {
		if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
			this.setState({ hasError: false, error: null });
		}
	}

	render() {
		if (this.state.hasError) {
			return (
				<div className="flex h-full w-full items-center justify-center bg-neutral-900">
					<div className="max-w-md rounded-lg border border-neutral-700 bg-neutral-800 p-6 text-center">
						<h2 className="mb-2 text-lg font-semibold text-neutral-100">
							Rendering Error
						</h2>
						<p className="mb-4 text-sm text-neutral-400">
							{this.state.error?.message ||
								"An unexpected WebGL error occurred."}
						</p>
						<button
							type="button"
							onClick={() => window.location.reload()}
							className="rounded-md bg-neutral-600 px-4 py-2 text-sm font-medium text-neutral-100 transition-colors hover:bg-neutral-500"
						>
							Reload
						</button>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}
