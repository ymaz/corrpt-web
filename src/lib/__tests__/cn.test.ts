import { describe, expect, it } from "vitest";
import { cn } from "../cn";

describe("cn", () => {
	it("merges class names", () => {
		expect(cn("a", "b")).toBe("a b");
	});

	it("handles conditional classes (false)", () => {
		expect(cn("a", false && "b", "c")).toBe("a c");
	});

	it("handles conditional classes (undefined/null)", () => {
		expect(cn("a", undefined, null, "b")).toBe("a b");
	});

	it("resolves Tailwind conflicts — last class wins", () => {
		expect(cn("p-2", "p-4")).toBe("p-4");
	});

	it("resolves conflicting Tailwind modifiers", () => {
		expect(cn("text-sm", "text-lg")).toBe("text-lg");
	});

	it("returns empty string with no arguments", () => {
		expect(cn()).toBe("");
	});

	it("accepts array inputs", () => {
		expect(cn(["a", "b"], "c")).toBe("a b c");
	});
});
