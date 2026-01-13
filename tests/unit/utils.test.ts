import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn helper", () => {
  it("keeps the latest Tailwind utility when duplicates collide", () => {
    expect(cn("p-2", "p-1")).toBe("p-1");
  });

  it("combines unrelated utilities without duplicates", () => {
    expect(cn("text-center", "text-center", "bg-slate-900")).toBe("text-center bg-slate-900");
  });
});
