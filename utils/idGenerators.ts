// utils/idGenerators.ts
export const generateId = (prefix: string) => `${prefix}-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 7)}`;

export const generateOrderItemId = (): string => {
  return generateId('oi');
};

export const generateProductionOrderItemId = (): string => {
  return `POI-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 7)}`;
};