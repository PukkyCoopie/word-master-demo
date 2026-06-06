/** 未拥有负债类宝藏时的钱包下限 */
export const DEFAULT_WALLET_FLOOR = 0;

/**
 * @param {number} wallet
 * @param {number} cost
 * @param {number} [walletFloor]
 */
export function canAffordWallet(wallet, cost, walletFloor = DEFAULT_WALLET_FLOOR) {
  const w = Math.floor(Number(wallet) || 0);
  const c = Math.max(0, Math.floor(Number(cost) || 0));
  const floor = Math.floor(Number(walletFloor) || 0);
  if (!Number.isFinite(w) || !Number.isFinite(c)) return false;
  return w - c >= floor;
}

/**
 * @param {number} wallet
 * @param {number} delta 可正可负
 * @param {number} [walletFloor]
 */
export function applyWalletDeltaClamped(wallet, delta, walletFloor = DEFAULT_WALLET_FLOOR) {
  const w = Math.floor(Number(wallet) || 0);
  const d = Math.floor(Number(delta) || 0);
  const floor = Math.floor(Number(walletFloor) || 0);
  return Math.max(floor, w + d);
}
