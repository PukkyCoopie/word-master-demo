import { buildRunDiscoveryDisplayItems } from "./runCollectionDiscoveries.js";
import {
  createPreviewNavGroupFromItems,
  sameRunDiscoveryDisplayItem,
  withPreviewNavKind,
} from "../preview/previewGroupNav.js";
import {
  buildAccessoryTileDetailPayload,
  buildCollectionSpellPreview,
  buildCollectionTreasurePreview,
  buildCollectionUpgradePreview,
  buildMaterialTileDetailPayload,
} from "../collection/collectionPreview.js";
import { buildOwnedVoucherDetailTreasure } from "../vouchers/voucherOwnedDisplay.js";
import { getTier1DefForPair, getTier2DefForPair } from "../vouchers/voucherDefinitions.js";

function buildRunEndDiscoveryNav(item, allItems, kind) {
  const items = allItems.filter((x) => x.kind === item.kind);
  return withPreviewNavKind(
    createPreviewNavGroupFromItems(items, (x) => sameRunDiscoveryDisplayItem(x, item)),
    kind,
  );
}

/**
 * @param {object} params
 * @param {import('./runCollectionDiscoveries.js').RunDiscoveryLog | null | undefined} params.runDiscoveryLog
 * @param {{ item?: import('./runCollectionDiscoveriesDisplay.js').RunDiscoveryDisplayItem, originRect?: any }} params.payload
 * @param {(args: { kind: string, treasure: object, originRect: any, previewNav?: any }) => void} params.presentTreasureDetail
 * @param {(payload: object, originRect?: any, previewNav?: any) => void} params.openTileDetail
 */
export function handleRunEndDiscoverySelect(params) {
  const item = params.payload?.item;
  if (!item || typeof item !== "object") return;
  const originRect = params.payload?.originRect ?? null;
  const allItems = buildRunDiscoveryDisplayItems(params.runDiscoveryLog);

  if (item.kind === "treasure") {
    const treasure = buildCollectionTreasurePreview(item.treasureId);
    if (!treasure) return;
    params.presentTreasureDetail({
      kind: "offer",
      treasure,
      originRect,
      previewNav: buildRunEndDiscoveryNav(item, allItems, "run-end-treasure"),
    });
    return;
  }
  if (item.kind === "spell") {
    const treasure = buildCollectionSpellPreview(item.spellId);
    if (!treasure) return;
    params.presentTreasureDetail({
      kind: "offer",
      treasure,
      originRect,
      previewNav: buildRunEndDiscoveryNav(item, allItems, "run-end-treasure"),
    });
    return;
  }
  if (item.kind === "upgrade") {
    const treasure = buildCollectionUpgradePreview(item.upgradeId);
    if (!treasure) return;
    params.presentTreasureDetail({
      kind: "offer",
      treasure,
      originRect,
      previewNav: buildRunEndDiscoveryNav(item, allItems, "run-end-treasure"),
    });
    return;
  }
  if (item.kind === "voucher") {
    const tier1 = getTier1DefForPair(item.pairId);
    const tier2 = item.tier >= 2 ? getTier2DefForPair(item.pairId) : null;
    if (!tier1) return;
    const treasure = buildOwnedVoucherDetailTreasure({ pairId: item.pairId, tier1, tier2 });
    if (!treasure) return;
    params.presentTreasureDetail({
      kind: "offer",
      treasure,
      originRect,
      previewNav: buildRunEndDiscoveryNav(item, allItems, "run-end-treasure"),
    });
    return;
  }
  if (item.kind === "material") {
    const tilePayload = buildMaterialTileDetailPayload(item.materialId);
    if (!tilePayload) return;
    params.openTileDetail(
      tilePayload,
      originRect,
      buildRunEndDiscoveryNav(item, allItems, "run-end-tile"),
    );
    return;
  }
  if (item.kind === "accessory") {
    const tilePayload = buildAccessoryTileDetailPayload(item.accessoryId);
    if (!tilePayload) return;
    params.openTileDetail(
      tilePayload,
      originRect,
      buildRunEndDiscoveryNav(item, allItems, "run-end-tile"),
    );
  }
}
