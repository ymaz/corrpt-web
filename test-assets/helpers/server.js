import { spawn } from "node:child_process";

/**
 * Start the Vite dev server and wait for it to be ready.
 * @param {string} projectRoot  Absolute path to the project root
 * @param {number} [port=5199]  Port to listen on
 * @param {number} [timeout=30000]  Max wait time in ms
 * @returns {Promise<{process: import('node:child_process').ChildProcess, url: string}>}
 */
export async function startDevServer(
	projectRoot,
	port = 5199,
	timeout = 30000,
) {
	const proc = spawn("npm", ["run", "dev", "--", "--port", String(port)], {
		cwd: projectRoot,
		stdio: "pipe",
	});

	const url = await new Promise((resolve, reject) => {
		const timer = setTimeout(
			() => reject(new Error("Dev server timeout")),
			timeout,
		);

		const onData = (data) => {
			const match = data.toString().match(/Local:\s+(http:\/\/[^\s]+)/);
			if (match) {
				clearTimeout(timer);
				resolve(match[1]);
			}
		};

		proc.stdout.on("data", onData);
		proc.stderr.on("data", onData);
		proc.on("error", (err) => {
			clearTimeout(timer);
			reject(err);
		});
	});

	return { process: proc, url };
}

/**
 * Kill the dev server process.
 * @param {{process: import('node:child_process').ChildProcess}} server
 */
export function stopServer(server) {
	server.process.kill();
}
