import { describe, expect, it } from "vitest";
import { productKeys } from "./products";
import { getEntitledProducts, hasProductAccess } from "./entitlements";

describe("XinUS product entitlement resolution", () => {
  it("grants administrators access to every standalone product without querying individual entitlement rows", async () => {
    await expect(getEntitledProducts(1, "admin")).resolves.toEqual(productKeys);
    await expect(hasProductAccess(1, "ged_tutor", "admin")).resolves.toBe(true);
    await expect(hasProductAccess(1, "hidden_gems", "admin")).resolves.toBe(true);
    await expect(hasProductAccess(1, "sitrep", "admin")).resolves.toBe(true);
    await expect(hasProductAccess(1, "pam", "admin")).resolves.toBe(true);
  });
});
