import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import glsl from "vite-plugin-glsl";
import { defineConfig } from "vitest/config";

// https://vite.dev/config/
export default defineConfig({
	base: process.env.GITHUB_ACTIONS ? "/corrpt-web/" : "/",
	plugins: [
		react(),
		tailwindcss(),
		glsl({
			include: ["**/*.glsl", "**/*.vert", "**/*.frag"],
			minify: true,
		}),
	],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	test: {
		environment: "node",
		include: ["src/**/*.test.{ts,tsx}"],
	},
	build: {
		rollupOptions: {
			output: {
				manualChunks(id) {
					if (id.includes("node_modules/three/")) {
						return "vendor-three";
					}
					if (
						id.includes("node_modules/react/") ||
						id.includes("node_modules/react-dom/") ||
						id.includes("node_modules/@react-three/")
					) {
						return "vendor-react";
					}
				},
			},
		},
	},
});
