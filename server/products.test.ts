import { describe, expect, it } from "vitest";
import { XINUS_PRODUCTS } from "./products";

describe("XinUS standalone product catalog", () => {
  it("keeps Recovery free to the participant while professional products are organization funded", () => {
    expect(XINUS_PRODUCTS.recovery.billingModel).toBe("free");
    expect(XINUS_PRODUCTS.pd_pro.billingModel).toBe("organization");
    expect(XINUS_PRODUCTS.task_force_pro.billingModel).toBe("organization");
  });

  it("includes PAM with the products that provide the shared reflective experience", () => {
    expect(XINUS_PRODUCTS.pd_pro.grants).toContain("pam");
    expect(XINUS_PRODUCTS.ged_tutor.grants).toContain("pam");
    expect(XINUS_PRODUCTS.recovery.grants).toContain("pam");
  });

  it("exposes PAM as the only named reflective companion product", () => {
    expect(XINUS_PRODUCTS.pam).toMatchObject({ key: "pam", name: "XinUS PAM", route: "/pam" });
    expect(Object.values(XINUS_PRODUCTS).map(product => product.name)).not.toContain("XinUS Wraith");
  });

  it("keeps Task Force Pro as a distinct operational application", () => {
    expect(XINUS_PRODUCTS.task_force_pro.route).toBe("/task-force-pro");
    expect(XINUS_PRODUCTS.task_force_pro.route).not.toBe(XINUS_PRODUCTS.recovery.route);
  });
});
