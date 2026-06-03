/**
 * 收藏页的 Android 返回：先关预览层，否则交给 App 壳返回主菜单。
 * @param {object} ctx
 * @returns {boolean}
 */
export function handleCollectionAndroidBack(ctx) {
  if (ctx.collectionTreasureDetail.value) {
    ctx.collectionTreasureDetail.value = null;
    return true;
  }
  if (ctx.collectionTileDetailPayload.value) {
    ctx.closeCollectionTileDetail();
    return true;
  }
  return false;
}
