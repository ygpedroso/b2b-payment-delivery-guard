import { describe, it, expect } from "vitest";
import { loader } from "../../app/routes/healthz";

describe("healthz route", () => {
  it("returns 200 OK with no-cache headers", async () => {
    const response = await loader();

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("OK");
    expect(response.headers.get("Content-Type")).toBe("text/plain");
    expect(response.headers.get("Cache-Control")).toBe(
      "no-cache, no-store, must-revalidate"
    );
  });
});
