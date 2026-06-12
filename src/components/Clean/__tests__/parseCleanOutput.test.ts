import { describe, it, expect } from "vitest";
import { parseCleanOutput } from "..";

describe("parseCleanOutput", () => {
  it("parses section headers", () => {
    const input = `➤ Cache Files
`;
    const result = parseCleanOutput(input);
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].name).toBe("Cache Files");
  });

  it("parses items with count", () => {
    const input = `➤ Build Artifacts
✓ node_modules 3 items, 1.2GB
`;
    const result = parseCleanOutput(input);
    expect(result.sections[0].items).toHaveLength(1);
    expect(result.sections[0].items[0]).toEqual({
      name: "node_modules",
      size: "1.2GB",
      skipped: false,
      checked: true,
    });
  });

  it("parses items without count", () => {
    const input = `➤ Logs
✓ system.log 500MB
`;
    const result = parseCleanOutput(input);
    expect(result.sections[0].items[0]).toEqual({
      name: "system.log",
      size: "500MB",
      skipped: false,
      checked: true,
    });
  });

  it("parses empty/skipped items", () => {
    const input = `➤ Cache
✓ temp files · already empty
`;
    const result = parseCleanOutput(input);
    expect(result.sections[0].items[0]).toEqual({
      name: "temp files - already empty",
      size: "",
      skipped: true,
      checked: false,
    });
  });

  it("parses warnings", () => {
    const input = `➤ System
◎ Requires admin privileges
`;
    const result = parseCleanOutput(input);
    expect(result.sections[0].items[0]).toEqual({
      name: "Requires admin privileges",
      size: "",
      skipped: true,
      checked: false,
    });
  });

  it("parses summary", () => {
    const input = `Potential space: 2.5GB | Items: 12 | Categories: 3
`;
    const result = parseCleanOutput(input);
    expect(result.summary).toEqual({
      potentialSpace: "2.5GB",
      items: 12,
      categories: 3,
    });
  });

  it("parses a full output sample", () => {
    const input = `➤ Build Artifacts
✓ node_modules 3 items, 1.2GB
✓ dist 500MB
✓ .cache · already empty

➤ Logs
◎ Requires admin privileges
✓ app.log 100MB

Potential space: 1.8GB | Items: 4 | Categories: 2
`;
    const result = parseCleanOutput(input);
    expect(result.sections).toHaveLength(2);
    expect(result.sections[0].name).toBe("Build Artifacts");
    expect(result.sections[0].items).toHaveLength(3);
    expect(result.sections[1].name).toBe("Logs");
    expect(result.sections[1].items).toHaveLength(2);
    expect(result.summary).toEqual({
      potentialSpace: "1.8GB",
      items: 4,
      categories: 2,
    });
  });

  it("returns empty sections for empty input", () => {
    const result = parseCleanOutput("");
    expect(result.sections).toHaveLength(0);
    expect(result.summary).toBeNull();
  });

  it("preserves rawOutput", () => {
    const input = "some raw text";
    const result = parseCleanOutput(input);
    expect(result.rawOutput).toBe(input);
  });
});
