import { describe, expect, it } from "vitest";
import { assertProviderId, isProviderId } from "./provider-id.ts";

describe("provider ids", () => {
  it("accepts catalog provider ids", () => {
    expect(isProviderId("sage_sales_management")).toBe(true);
    expect(isProviderId("wttr_in")).toBe(true);
    expect(isProviderId("fusion-api")).toBe(true);
  });

  it("rejects ids that are unsafe as provider paths or catalog filenames", () => {
    for (const value of ["../x", "Foo", "foo/bar", "foo.json", ""]) {
      expect(isProviderId(value)).toBe(false);
      expect(() => assertProviderId(value)).toThrow("provider id must match");
    }
  });
});
