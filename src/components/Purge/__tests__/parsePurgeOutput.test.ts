import { describe, it, expect } from "vitest";
import { parsePurgeOutput } from "..";

describe("parsePurgeOutput", () => {
  it("parses summary line", () => {
    const input = `Would free: 5.2GB | Items: 150 | Free: 8.0GB
`;
    const result = parsePurgeOutput(input);
    expect(result.summary).toEqual({
      wouldFree: "5.2GB",
      items: 150,
      free: "8.0GB",
    });
  });

  it("detects dry run mode", () => {
    const input = `DRY RUN MODE
Would free: 1.0GB | Items: 10 | Free: 2.0GB
`;
    const result = parsePurgeOutput(input);
    expect(result.isDryRun).toBe(true);
    expect(result.summary).not.toBeNull();
  });

  it("detects dry run mode case-insensitively", () => {
    const input = `Dry Run Mode
`;
    const result = parsePurgeOutput(input);
    expect(result.isDryRun).toBe(true);
  });

  it("returns null summary when no summary line present", () => {
    const input = `Some other output
Without a summary
`;
    const result = parsePurgeOutput(input);
    expect(result.summary).toBeNull();
  });

  it("handles empty input", () => {
    const result = parsePurgeOutput("");
    expect(result.summary).toBeNull();
    expect(result.isDryRun).toBe(false);
    expect(result.rawOutput).toBe("");
  });

  it("preserves rawOutput", () => {
    const input = "some raw output";
    const result = parsePurgeOutput(input);
    expect(result.rawOutput).toBe(input);
  });
});
