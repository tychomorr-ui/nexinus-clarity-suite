export type DashboardProduct = { key: string; entitled: boolean };

export function updateRecentProductKeys(current: string[], productKey: string, limit = 4) {
  return [productKey, ...current.filter(item => item !== productKey)].slice(0, limit);
}

export function entitledRecentProducts<T extends DashboardProduct>(recentKeys: string[], catalog: T[]) {
  return recentKeys.map(key => catalog.find(product => product.key === key)).filter((product): product is T => Boolean(product?.entitled));
}

export function updateEnabledContextProducts<T extends string>(current: T[], productKey: T): T[] {
  return current.includes(productKey) ? current.filter(key => key !== productKey) : [...current, productKey];
}
