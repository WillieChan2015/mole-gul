import { describe, it, expect } from "vitest";
import { parseOptimizeOutput } from "..";

describe("parseOptimizeOutput", () => {
  it("parses section headers", () => {
    const input = `➤ Performance Tweaks
`;
    const result = parseOptimizeOutput(input);
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].name).toBe("Performance Tweaks");
  });

  it("parses action items", () => {
    const input = `➤ Performance Tweaks
→ Disable Spotlight indexing
→ Reduce transparency
`;
    const result = parseOptimizeOutput(input);
    expect(result.sections[0].actions).toHaveLength(2);
    expect(result.sections[0].actions[0]).toEqual({ name: "Disable Spotlight indexing" });
    expect(result.sections[0].actions[1]).toEqual({ name: "Reduce transparency" });
  });

  it("detects dry run mode", () => {
    const input = `DRY RUN MODE
➤ Section
→ Action
`;
    const result = parseOptimizeOutput(input);
    expect(result.isDryRun).toBe(true);
  });

  it("detects dry run mode case-insensitively", () => {
    const input = `dry run mode
`;
    const result = parseOptimizeOutput(input);
    expect(result.isDryRun).toBe(true);
  });

  it("parses summary line", () => {
    const input = `Would apply 5 optimizations
`;
    const result = parseOptimizeOutput(input);
    expect(result.summary).toBe("Would apply 5 optimizations");
  });

  it("parses diagnosis block", () => {
    const input = `PERFORMANCE DIAGNOSIS
◎ High CPU usage detected
☞ Consider reducing startup items
`;
    const result = parseOptimizeOutput(input);
    expect(result.diagnosis).toEqual({
      lines: ["◎ High CPU usage detected", "☞ Consider reducing startup items"],
    });
  });

  it("parses a full output sample", () => {
    const input = `DRY RUN MODE

PERFORMANCE DIAGNOSIS
◎ Memory pressure is high
☞ Close unused applications

➤ Memory Management
→ Clear inactive memory
→ Purge standby memory

➤ Network
→ Flush DNS cache
→ Reset network interface

Would apply 4 optimizations
`;
    const result = parseOptimizeOutput(input);
    expect(result.isDryRun).toBe(true);
    expect(result.diagnosis).toEqual({
      lines: ["◎ Memory pressure is high", "☞ Close unused applications"],
    });
    expect(result.sections).toHaveLength(2);
    expect(result.sections[0].name).toBe("Memory Management");
    expect(result.sections[0].actions).toHaveLength(2);
    expect(result.sections[1].name).toBe("Network");
    expect(result.sections[1].actions).toHaveLength(2);
    expect(result.summary).toBe("Would apply 4 optimizations");
  });

  it("returns empty sections for empty input", () => {
    const result = parseOptimizeOutput("");
    expect(result.sections).toHaveLength(0);
    expect(result.diagnosis).toBeNull();
    expect(result.summary).toBeNull();
    expect(result.isDryRun).toBe(false);
  });

  it("preserves rawOutput", () => {
    const input = "raw text";
    const result = parseOptimizeOutput(input);
    expect(result.rawOutput).toBe(input);
  });
});
