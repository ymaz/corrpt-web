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
		rolldownOptions: {
			output: {
				codeSplitting: {
					minShareCount: 1,
					groups: [
						{
							name: "vendor-three",
							test: /node_modules[\\/]three[\\/]/,
							priority: 10,
						},
						{
							name: "vendor-react",
							test: /node_modules[\\/](react|react-dom|@react-three)[\\/]/,
						},
					],
				},
			},
		},
	},
});
