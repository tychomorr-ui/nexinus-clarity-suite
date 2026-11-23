import { describe, expect, it } from "vitest";
import { entitledRecentProducts, updateEnabledContextProducts, updateRecentProductKeys } from "./productsDashboard";

describe("My XinUS Apps dashboard behavior", () => {
  it("keeps quick launch ordered by most recent use without duplicates", () => {
    expect(updateRecentProductKeys(["clarity", "ged_tutor", "sitrep", "pam"], "ged_tutor")).toEqual(["ged_tutor", "clarity", "sitrep", "pam"]);
    expect(updateRecentProductKeys(["clarity", "ged_tutor", "sitrep", "pam"], "pd_pro")).toEqual(["pd_pro", "clarity", "ged_tutor", "sitrep"]);
  });

  it("shows recent apps only when the user remains entitled", () => {
    const catalog = [{ key: "clarity", entitled: true }, { key: "ged_tutor", entitled: false }, { key: "sitrep", entitled: true }];
    expect(entitledRecentProducts(["ged_tutor", "sitrep", "clarity"], catalog).map(product => product.key)).toEqual(["sitrep", "clarity"]);
  });

  it("toggles each approved context destination independently", () => {
    expect(updateEnabledContextProducts(["clarity"], "ged_tutor")).toEqual(["clarity", "ged_tutor"]);
    expect(updateEnabledContextProducts(["clarity", "ged_tutor"], "clarity")).toEqual(["ged_tutor"]);
  });
});
