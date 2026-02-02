/**
 * Create a test reporter that tracks pass/fail assertions.
 * @returns {{assert: (condition: boolean, name: string) => void, summary: () => void, exitCode: () => number}}
 */
export function createReporter() {
	const failures = [];
	let code = 0;

	return {
		assert(condition, name) {
			if (!condition) {
				console.error(`  FAIL: ${name}`);
				failures.push(name);
				code = 1;
			} else {
				console.log(`  PASS: ${name}`);
			}
		},

		summary() {
			console.log("\n--- Results ---");
			if (failures.length > 0) {
				console.error(`${failures.length} assertion(s) failed:`);
				for (const f of failures) console.error(`  - ${f}`);
			} else {
				console.log("All assertions passed.");
			}
		},

		exitCode() {
			return code;
		},
	};
}

/**
 * Return errors that appeared after a given checkpoint index.
 * @param {string[]} consoleErrors  The shared error array from createBrowser
 * @param {number} checkpoint       Index to start from
 * @returns {string[]}
 */
export function errorsSince(consoleErrors, checkpoint) {
	return consoleErrors.slice(checkpoint);
}
