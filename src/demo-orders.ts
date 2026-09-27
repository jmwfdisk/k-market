import type { Product } from './catalog';

export type DemoOrder = {
  id: string; productName: string; option: string; quantity: number;
  amountCents: number; createdAt: string; status: 'DEMO';
};
const key = 'kmarket.demo-orders.v1';
export function demoOrders(): DemoOrder[] {
  try { return JSON.parse(sessionStorage.getItem(key) || '[]'); } catch { return []; }
}
export function createDemoOrder(product: Product, option: string, quantity: number): DemoOrder {
  if (!product.options.includes(option) || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
    throw new Error('옵션과 수량을 확인해 주세요.');
  }
  const order: DemoOrder = {
    id: `DEMO-${crypto.randomUUID()}`, productName: product.name, option, quantity,
    amountCents: product.price * quantity, createdAt: new Date().toISOString(), status: 'DEMO',
  };
  sessionStorage.setItem(key, JSON.stringify([order, ...demoOrders()].slice(0, 20)));
  return order;
}
