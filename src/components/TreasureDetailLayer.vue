<template>
  <Teleport defer to="#game-view-portal-frame">
    <div
      ref="backdropRef"
      class="treasure-detail-backdrop"
      :class="{
        'treasure-detail-backdrop--boot': bootMask,
        'treasure-detail-backdrop--deck-offer': isDeckOffer,
        'portal-overlay--shop-upgrade-suppressed': overlaySuppressed,
      }"
      :aria-label="isDeckOffer ? tileDetailLayerCopy.ariaLabelDialog : undefined"
      :style="backdropStackStyle"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="isDeckOffer ? undefined : titleId"
      @click.self="onBackdropSelfClick"
    >
      <!-- 与 ShopPanel.shop-header-panel 同款：左上占位宽度对齐 SHOP 招牌；右上钱包仅在商店内打开详情时显示 -->
      <div class="treasure-detail-header-panel" @click.self="onBackdropSelfClick">
        <div class="treasure-detail-header-logo-sizer" aria-hidden="true"></div>
        <div
          v-if="showHeaderWallet"
          ref="walletBoxRef"
          class="header-box header-box-split header-box-wallet treasure-detail-wallet"
          title="当前钱包余额"
          @click.stop
        >
          <span class="header-split-label">钱包</span>
          <span class="header-wallet-marks" :class="{ 'money-tone--debt': walletAmount < 0 }">
            <span class="money-dollar-char">$</span
            ><span class="header-wallet-amount">{{ formatWallet(walletAmount) }}</span>
          </span>
        </div>
      </div>

      <div class="treasure-detail-body" @click.self="onBackdropSelfClick">
        <div class="treasure-detail-stack" @click.self="onBackdropSelfClick">
          <div
            v-if="!isDeckOffer"
            ref="titleGroupRef"
            class="treasure-detail-title-group treasure-detail-stagger-el"
            :style="collectionLockedVisualStyle"
          >
            <p class="treasure-detail-kind-caption">{{ detailKindCaption }}</p>
            <h2 :id="titleId" ref="nameRef" class="treasure-detail-name">
              {{ displayTreasureName }}
            </h2>
          </div>

          <div ref="iconColumnRef" class="treasure-detail-icon-column" :style="collectionLockedVisualStyle">
            <div
              ref="targetVisualRef"
              class="shop-treasure-visual shop-treasure-visual--detail"
              :class="{ 'shop-treasure-visual--deck-offer': isDeckOffer }"
            >
              <template v-if="isDeckOffer">
                <div ref="deckOfferStackRef" class="shop-deck-offer-product-stack">
                  <LetterTile
                    ref="detailFlyFrameRef"
                    variant="grid"
                    class="shop-shelf-letter-tile shop-shelf-letter-tile--detail"
                    v-bind="deckOfferLetterTileBind"
                  />
                  <div
                    class="shop-treasure-price"
                    :aria-label="mode === 'pack-inner' ? '参考售价' : mode === 'offer' ? '售价' : '回收价'"
                  >
                    <div
                      class="shop-treasure-price-inner"
                      :class="[
                        { 'shop-treasure-price-inner--pack-struck': mode === 'pack-inner' },
                        offerShelfPriceInnerClasses,
                      ]"
                    >
                      <template v-if="mode === 'offer'">${{ offerPriceDisplayed }}</template>
                      <template v-else-if="mode === 'pack-inner'">${{ offerPriceDisplayed }}</template>
                      <template v-else>${{ sellRefund }}</template>
                    </div>
                  </div>
                </div>
              </template>
              <div
                v-else-if="isVoucherOffer && voucherDetailStacked"
                ref="detailFlyFrameRef"
                class="voucher-detail-stamp-stack"
              >
                <div
                  class="shop-treasure-frame shop-treasure-frame--detail shop-treasure-frame--voucher-stamp voucher-detail-stamp-stack__back"
                  aria-hidden="true"
                >
                  <span class="shop-treasure-emoji shop-treasure-emoji--detail" role="img">{{
                    voucherOwnedTierPanels[0]?.emoji ?? treasure.emoji
                  }}</span>
                </div>
                <div
                  class="shop-treasure-frame shop-treasure-frame--detail shop-treasure-frame--voucher-stamp voucher-detail-stamp-stack__front"
                >
                  <span ref="emojiRef" class="shop-treasure-emoji shop-treasure-emoji--detail" role="img">{{
                    voucherOwnedTierPanels[1]?.emoji ?? treasure.emoji
                  }}</span>
                </div>
              </div>
              <div
                v-else
                ref="detailFlyFrameRef"
                class="shop-treasure-frame shop-treasure-frame--detail"
                :class="{
                  'shop-treasure-frame--owned': isOwnedMode,
                  'shop-treasure-frame--bundle-pack-detail': isBundlePack,
                  'shop-treasure-frame--length-offer':
                    treasure?.offerType === 'upgrade' && treasure?.upgradeKind !== 'rarity',
                  'shop-treasure-frame--pack-rarity':
                    treasure?.offerType === 'upgrade' && treasure?.upgradeKind === 'rarity',
                  'shop-treasure-frame--spell-offer': isSpellOffer,
                  'shop-treasure-frame--voucher-stamp': isVoucherOffer,
                  'shop-treasure-frame--collection-unknown': isCollectionLockedPreview,
                  'treasure-detail-frame--charge-inactive': chargeVisualState === 'inactive',
                  'treasure-detail-frame--charge-active': chargeVisualState === 'active',
                }"
                :style="{ '--charge-progress': String(chargeProgress ?? 0) }"
              >
                <template v-if="isCollectionLockedPreview">
                  <span ref="emojiRef" class="collection-detail-unknown-mark" aria-hidden="true">?</span>
                </template>
                <template v-else-if="isUpgradeOffer">
                  <i
                    v-if="treasure.iconClass"
                    ref="emojiRef"
                    class="shop-treasure-emoji shop-treasure-emoji--detail shop-treasure-emoji--icon"
                    :class="treasure.iconClass"
                    aria-hidden="true"
                  ></i>
                  <span v-else ref="emojiRef" class="shop-treasure-emoji shop-treasure-emoji--detail" role="img">{{
                    treasure.emoji
                  }}</span>
                  <span
                    v-if="isPackRarityUpgrade && (treasure.lengthBadgeLabel || treasure.lengthLabel)"
                    class="shop-pack-rarity-caption shop-upgrade-length--detail"
                    >{{ treasure.lengthBadgeLabel || treasure.lengthLabel }}</span
                  >
                  <span
                    v-else-if="treasure.lengthBadgeLabel || treasure.lengthLabel"
                    class="shop-upgrade-length shop-upgrade-length--detail"
                    :class="{
                      'shop-upgrade-length--single-digit': isSingleDigitLabel(
                        treasure.lengthBadgeLabel || treasure.lengthLabel,
                      ),
                    }"
                    >{{ treasure.lengthBadgeLabel || treasure.lengthLabel }}</span
                  >
                </template>
                <template v-else-if="isVoucherOffer">
                  <span ref="emojiRef" class="shop-treasure-emoji shop-treasure-emoji--detail" role="img">{{
                    treasure.emoji
                  }}</span>
                </template>
                <template v-else-if="isSpellOffer">
                  <i
                    v-if="treasure.iconClass"
                    ref="emojiRef"
                    class="shop-treasure-emoji shop-treasure-emoji--detail shop-treasure-emoji--icon"
                    :class="treasure.iconClass"
                    aria-hidden="true"
                  ></i>
                </template>
                <template v-else-if="isBundlePack">
                  <i
                    ref="emojiRef"
                    class="shop-treasure-emoji shop-treasure-emoji--detail shop-treasure-emoji--icon ri-gift-2-line"
                    aria-hidden="true"
                  ></i>
                  <span class="shop-bundle-pack-caption-detail">{{ bundlePackTypeLabel }}</span>
                </template>
                <template v-else>
                  <span class="letter-gem" :class="`gem-${gemRarityKey}`" aria-hidden="true" />
                  <i
                    v-if="treasure.iconClass"
                    ref="emojiRef"
                    class="shop-treasure-emoji shop-treasure-emoji--detail shop-treasure-emoji--icon"
                    :class="treasure.iconClass"
                    aria-hidden="true"
                  ></i>
                  <span v-else ref="emojiRef" class="shop-treasure-emoji shop-treasure-emoji--detail" role="img">{{
                    treasure.emoji
                  }}</span>
                  <span
                    v-if="treasure.lengthBadgeLabel || treasure.lengthLabel"
                    class="shop-upgrade-length shop-upgrade-length--detail"
                    :class="{
                      'shop-upgrade-length--single-digit': isSingleDigitLabel(
                        treasure.lengthBadgeLabel || treasure.lengthLabel,
                      ),
                    }"
                    >{{
                    treasure.lengthBadgeLabel || treasure.lengthLabel
                  }}</span>
                </template>
                <div
                  v-if="accessoryChipVisuals.length && !isCollectionLockedPreview"
                  class="treasure-accessory-chip-stack treasure-accessory-chip-stack--detail"
                  aria-hidden="true"
                >
                  <span
                    v-for="(chip, chipIx) in accessoryChipVisuals"
                    :key="`${chip.chipClass}-${chipIx}`"
                    class="treasure-accessory-chip"
                    :class="chip.chipClass"
                  >
                    <span class="treasure-accessory-chip-ripple" aria-hidden="true" />
                    <i class="treasure-accessory-chip-icon" :class="chip.iconClass" aria-hidden="true" />
                  </span>
                </div>
                <i
                  v-if="chargeVisualState != null"
                  class="treasure-charge-corner-icon treasure-detail-disabled-mark ri-flashlight-fill"
                  aria-hidden="true"
                ></i>
              </div>
              <div
                v-if="!isDeckOffer && showDetailShelfPrice"
                class="shop-treasure-price"
                :aria-label="mode === 'pack-inner' ? '参考售价' : mode === 'offer' || isCollectionPreviewMode ? '售价' : '回收价'"
              >
                <div
                  class="shop-treasure-price-inner"
                  :class="[
                    { 'shop-treasure-price-inner--pack-struck': mode === 'pack-inner' },
                    offerShelfPriceInnerClasses,
                  ]"
                >
                  {{ detailShelfPriceText }}
                </div>
              </div>
            </div>
          </div>

          <div
            v-if="showTreasureMainDescCard"
            ref="descRef"
            class="treasure-detail-desc-card treasure-detail-stagger-el"
          >
            <template v-if="isDeckOffer">
              <div v-if="showDetailRarityTag && showDeckOfferRarityScoreMult" class="treasure-detail-rarity-row">
                <span
                  class="treasure-rarity-tag"
                  :class="'treasure-rarity-tag--' + deckOfferRarityKey"
                  >{{ deckOfferRarityTagLabel }}</span
                >
              </div>
              <div v-if="showDeckOfferRarityScoreMult" class="tile-detail-rarity-score-mult">
                <div class="tile-detail-score-mult-frame">
                  <div class="info-score-mult" role="group" :aria-label="deckOfferScoreMultAria">
                    <span class="tile-detail-score-mult-side-label">{{
                      tileDetailLayerCopy.rarity.scoreLabel
                    }}</span>
                    <span class="info-mini-box info-mini-box--score">{{ deckOfferScoreDisplay }}</span>
                    <span class="info-mini-times" aria-hidden="true">×</span>
                    <span class="info-mini-box info-mini-box--mult">{{ deckOfferMultDisplay }}</span>
                    <span class="tile-detail-score-mult-side-label">{{
                      tileDetailLayerCopy.rarity.multLabel
                    }}</span>
                  </div>
                </div>
              </div>
            </template>
            <template v-else>
              <div v-if="showDetailRarityTag" class="treasure-detail-rarity-row">
                <span
                  class="treasure-rarity-tag"
                  :class="'treasure-rarity-tag--' + (treasure.rarity || 'rare')"
                  >{{ rarityTagLabel }}</span
                >
              </div>
              <TreasureDescRichText
                v-if="hasTreasureDescBody && showMainVoucherDesc"
                :description="descriptionOverride ?? treasure.description"
                polish-treasure-copy
                :probability-display-doubled="probabilityDisplayDoubled"
              />
              <template v-if="showUpgradePreviewGainRows">
                <div
                  v-for="(row, gainRowIdx) in upgradePreviewGainRows"
                  :key="'upgrade-gain-' + gainRowIdx"
                  class="upgrade-preview-gain-block"
                >
                  <div class="upgrade-preview-gain-row">
                    <div class="upgrade-preview-gain-label">{{ row.label }}</div>
                    <div class="tile-detail-score-mult-frame">
                      <div
                        class="info-score-mult"
                        role="group"
                        :aria-label="formatUpgradePreviewGainAria(row)"
                      >
                        <span class="info-mini-box info-mini-box--score">{{ row.scoreDisplay }}</span>
                        <span class="info-mini-times" aria-hidden="true">×</span>
                        <span class="info-mini-box info-mini-box--mult">{{ row.multDisplay }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
              <div
                v-if="showSpellReplayTargetRow"
                class="treasure-detail-spell-replay-prev-row"
              >
                <span class="treasure-detail-spell-replay-prev-label">上一张法术：</span>
                <button
                  type="button"
                  class="treasure-detail-spell-replay-prev-hit"
                  :aria-label="`预览上一张法术 ${spellReplayTargetName}`"
                  @click="emit('openSpellReplayTargetPreview')"
                >
                  <ShopSpellShelfCell
                    :icon-class="spellReplayTargetIconClass"
                    :price="spellReplayTargetPrice"
                    price-struck
                    :owned-voucher-ids="ownedVoucherIds"
                  />
                  <span class="treasure-detail-spell-replay-prev-name">{{ spellReplayTargetName }}</span>
                </button>
              </div>
            </template>
          </div>

          <div
            v-if="showUpgradeRoundingRulesPanel"
            ref="upgradeRoundingRulesPanelRef"
            class="treasure-detail-desc-card treasure-detail-stagger-el"
          >
            <div class="treasure-detail-desc-panel-title-row">
              <span class="treasure-detail-desc-panel-title-text">取整规则</span>
            </div>
            <TreasureDescRichText
              class="treasure-detail-desc-panel-rich"
              :description="upgradeRoundingRulesText"
              :panel-body="true"
            />
          </div>

          <div
            v-if="showCollectionUnlockHintPanel"
            ref="collectionUnlockHintPanelRef"
            class="treasure-detail-desc-card treasure-detail-stagger-el"
          >
            <div class="treasure-detail-desc-panel-title-row">
              <span class="treasure-detail-desc-panel-title-text">{{
                collectionUnlockHintPanel.title
              }}</span>
            </div>
            <TreasureDescRichText
              class="treasure-detail-desc-panel-rich"
              :description="collectionUnlockHintPanel.description"
              :panel-body="true"
            />
          </div>

          <div
            v-if="showCollectionUnlockPrerequisitePanel"
            ref="collectionUnlockPrerequisitePanelRef"
            class="treasure-detail-desc-card treasure-detail-stagger-el"
          >
            <div class="treasure-detail-desc-panel-title-row">
              <CollectionPrerequisiteBadge />
              <span class="treasure-detail-desc-panel-title-text">{{
                collectionUnlockPrerequisitePanel?.title
              }}</span>
            </div>
            <TreasureDescRichText
              class="treasure-detail-desc-panel-rich"
              :description="collectionUnlockPrerequisitePanel.description"
              :panel-body="true"
            />
          </div>

          <div
            v-for="(panel, tierPanelIdx) in voucherOwnedTierPanels"
            :key="'voucher-tier-' + panel.tier"
            :ref="(el) => setVoucherTierPanelRef(tierPanelIdx, el)"
            class="treasure-detail-desc-card treasure-detail-stagger-el"
          >
            <div class="treasure-detail-desc-panel-title-row">
              <span class="treasure-detail-desc-panel-title-text">{{ panel.title }}</span>
            </div>
            <TreasureDescRichText
              class="treasure-detail-desc-panel-rich"
              :description="panel.description"
              :panel-body="true"
            />
          </div>

          <div
            v-if="isDeckOffer && showDeckOfferMaterialRegion"
            ref="deckOfferMaterialRef"
            class="treasure-detail-desc-card treasure-detail-stagger-el"
          >
            <div class="treasure-detail-desc-panel-title-row">
              <span class="treasure-detail-desc-panel-title-text">{{ deckOfferMaterialTitle }}</span>
            </div>
            <TreasureDescRichText
              class="treasure-detail-desc-panel-rich"
              :description="deckOfferMaterialEffectText"
              :panel-body="true"
            />
          </div>

          <div
            v-if="isDeckOffer && showDeckOfferAccessoryRegion"
            ref="deckOfferAccessoryRef"
            class="treasure-detail-desc-card treasure-detail-stagger-el"
          >
            <div class="treasure-detail-desc-panel-title-row">
              <span
                v-if="deckOfferTileAccessoryChipVisual"
                class="tile-accessory-chip detail-panel-accessory-chip-inline"
                :class="deckOfferTileAccessoryChipVisual.chipClass"
                aria-hidden="true"
              >
                <span class="tile-accessory-chip-ripple" aria-hidden="true" />
                <i
                  class="tile-accessory-chip-icon"
                  :class="deckOfferTileAccessoryChipVisual.iconClass"
                  aria-hidden="true"
                />
              </span>
              <span class="treasure-detail-desc-panel-title-text">{{ deckOfferAccessoryTitle }}</span>
            </div>
            <TreasureDescRichText
              class="treasure-detail-desc-panel-rich"
              :description="deckOfferAccessoryDesc"
              :panel-body="true"
            />
          </div>

          <div
            v-for="panel in deckOfferAccessoryLinkedConceptPanels"
            :key="'deck-offer-acc-linked-' + panel.title"
            class="treasure-detail-desc-card treasure-detail-stagger-el"
          >
            <div class="treasure-detail-desc-panel-title-row">
              <span class="treasure-detail-desc-panel-title-text">{{ panel.title }}</span>
            </div>
            <TreasureDescRichText
              class="treasure-detail-desc-panel-rich"
              :description="panel.effectDescription"
              :panel-body="true"
            />
          </div>

          <div
            v-if="isDeckOffer && showDeckOfferTreasureAccessoryRegion"
            ref="deckOfferTreasureAccessoryRef"
            class="treasure-detail-desc-card treasure-detail-stagger-el"
          >
            <div class="treasure-detail-desc-panel-title-row">
              <span
                v-if="deckOfferTreasureAccessoryChipVisual"
                class="treasure-accessory-chip detail-panel-accessory-chip-inline"
                :class="deckOfferTreasureAccessoryChipVisual.chipClass"
                aria-hidden="true"
              >
                <span class="treasure-accessory-chip-ripple" aria-hidden="true" />
                <i
                  class="treasure-accessory-chip-icon"
                  :class="deckOfferTreasureAccessoryChipVisual.iconClass"
                  aria-hidden="true"
                />
              </span>
              <span class="treasure-detail-desc-panel-title-text">{{ deckOfferTreasureAccessoryTitle }}</span>
            </div>
            <TreasureDescRichText
              class="treasure-detail-desc-panel-rich"
              :description="deckOfferTreasureAccessoryDesc"
              :panel-body="true"
            />
          </div>

          <div
            v-if="showVoucherSalePanel"
            ref="voucherSalePanelRef"
            class="treasure-detail-desc-card treasure-detail-stagger-el"
          >
            <div class="treasure-detail-desc-panel-title-row">
              <span
                class="treasure-detail-desc-panel-title-text treasure-detail-desc-panel-title-text--shop-discount"
                >{{ SHOP_VOUCHER_SALE_TITLE }}</span
              >
            </div>
            <TreasureDescRichText
              class="treasure-detail-desc-panel-rich"
              :description="voucherSalePanelDescription"
              :panel-body="true"
            />
          </div>

          <div
            v-if="showPresetSalePanel"
            ref="presetSalePanelRef"
            class="treasure-detail-desc-card treasure-detail-stagger-el"
          >
            <div class="treasure-detail-desc-panel-title-row">
              <span
                class="treasure-detail-desc-panel-title-text treasure-detail-desc-panel-title-text--shop-discount"
                >{{ SHOP_PRESET_SALE_TITLE }}</span
              >
            </div>
            <TreasureDescRichText
              class="treasure-detail-desc-panel-rich"
              :description="presetSalePanelDescription"
              :panel-body="true"
            />
          </div>

          <div
            v-if="showRandomSalePanel"
            ref="randomSalePanelRef"
            class="treasure-detail-desc-card treasure-detail-stagger-el"
          >
            <div class="treasure-detail-desc-panel-title-row">
              <span
                class="treasure-detail-desc-panel-title-text treasure-detail-desc-panel-title-text--shop-discount"
                >{{ SHOP_RANDOM_SALE_TITLE }}</span
              >
            </div>
            <TreasureDescRichText
              class="treasure-detail-desc-panel-rich"
              :description="randomSalePanelDescription"
              :panel-body="true"
            />
          </div>

          <div
            v-if="showSpellGrantedVoucherPanel"
            ref="spellGrantedVoucherPanelRef"
            class="treasure-detail-desc-card treasure-detail-stagger-el"
          >
            <div class="treasure-detail-desc-panel-title-row">
              <span class="treasure-detail-desc-panel-title-text">{{
                SHOP_SPELL_GRANTED_VOUCHER_PANEL_TITLE
              }}</span>
            </div>
            <TreasureDescRichText
              class="treasure-detail-desc-panel-rich"
              :description="SHOP_SPELL_GRANTED_VOUCHER_PANEL_DESCRIPTION"
              :panel-body="true"
            />
          </div>

          <div
            v-if="showTreasureGainPanel && !isDeckOffer"
            ref="treasureGainPanelRef"
            class="treasure-detail-extra-regions treasure-detail-stagger-el"
          >
            <div class="treasure-detail-desc-card treasure-detail-accessory-card">
              <div class="treasure-detail-desc-panel-title-row">
                <span class="treasure-detail-desc-panel-title-text">{{ treasureGainPanelContent.title }}</span>
              </div>
              <TreasureDescRichText
                class="treasure-detail-desc-panel-rich"
                :description="treasureGainPanelContent.description"
                :panel-body="true"
              />
            </div>
          </div>

          <div
            v-if="showSpellGainPanel && !isDeckOffer"
            ref="spellGainPanelRef"
            class="treasure-detail-extra-regions treasure-detail-stagger-el"
          >
            <div class="treasure-detail-desc-card treasure-detail-accessory-card">
              <div class="treasure-detail-desc-panel-title-row">
                <span class="treasure-detail-desc-panel-title-text">{{ spellGainPanelContent.title }}</span>
              </div>
              <TreasureDescRichText
                class="treasure-detail-desc-panel-rich"
                :description="spellGainPanelContent.description"
                :panel-body="true"
                :probability-display-doubled="probabilityDisplayDoubled"
              />
            </div>
          </div>

          <div
            v-for="(panel, conceptIdx) in descriptionConceptPanels"
            :key="'desc-concept-' + panel.title"
            :ref="(el) => setDescriptionConceptPanelRef(conceptIdx, el)"
            class="treasure-detail-desc-card treasure-detail-stagger-el"
          >
            <div class="treasure-detail-desc-panel-title-row">
              <span class="treasure-detail-desc-panel-title-text">{{ panel.title }}</span>
            </div>
            <TreasureDescRichText
              class="treasure-detail-desc-panel-rich"
              :description="panel.effectDescription"
              :panel-body="true"
              :probability-display-doubled="probabilityDisplayDoubled"
            />
          </div>

          <div
            v-if="showTreasureAccessoryPanels"
            ref="accessoryPanelRef"
            class="treasure-detail-extra-regions treasure-detail-stagger-el"
          >
            <div
              v-for="panel in treasureAccessoryPanels"
              :key="'treasure-acc-' + panel.id"
              class="treasure-detail-desc-card treasure-detail-accessory-card"
            >
              <div class="treasure-detail-desc-panel-title-row">
                <span
                  v-if="panel.chip"
                  class="treasure-accessory-chip detail-panel-accessory-chip-inline"
                  :class="panel.chip.chipClass"
                  aria-hidden="true"
                >
                  <span class="treasure-accessory-chip-ripple" aria-hidden="true" />
                  <i class="treasure-accessory-chip-icon" :class="panel.chip.iconClass" aria-hidden="true" />
                </span>
                <span class="treasure-detail-desc-panel-title-text">{{ panel.title }}</span>
              </div>
              <TreasureDescRichText
                class="treasure-detail-desc-panel-rich"
                :description="panel.body"
                :panel-body="true"
              />
            </div>
          </div>

          <div
            ref="actionsRef"
            class="treasure-detail-actions treasure-detail-stagger-el"
            :class="{ 'treasure-detail-actions--spell-grant': mode === 'offer' && spellGrantFlow }"
          >
            <button
              v-if="mode === 'offer' && !isCollectionPreviewMode && spellGrantFlow"
              type="button"
              class="shop-btn shop-btn--use"
              :disabled="!canBuyOffer"
              @click="emit('purchase')"
            >
              使用
            </button>
            <button
              v-else-if="mode === 'offer' && !isCollectionPreviewMode"
              type="button"
              class="shop-btn shop-btn--buy"
              :disabled="!canBuyOffer"
              @click="emit('purchase')"
            >
              购买
            </button>
            <button
              v-if="mode === 'pack-inner'"
              type="button"
              class="shop-btn shop-btn--buy"
              :disabled="!canBuyOffer"
              @click="emit('purchase')"
            >
              {{ packInnerPrimaryLabel }}
            </button>
            <button
              v-if="isOwnedMode"
              type="button"
              class="shop-btn shop-btn--reroll"
              :class="{ 'shop-btn--sell-blocked': sellBlockedByNoSell }"
              :disabled="!sellEnabled"
              @click="emit('sell')"
            >
              卖出 ${{ sellRefund }}
            </button>
            <button
              v-if="!(mode === 'offer' && !isCollectionPreviewMode && spellGrantFlow)"
              type="button"
              class="shop-btn shop-btn--next"
              @click="requestClose"
            >
              返回
            </button>
          </div>
        </div>
      </div>

      <PreviewGroupNav
        ref="previewNavRef"
        :index="previewNavIndex"
        :total="previewNavTotal"
        @step="onPreviewNavStep"
      />

      <!-- 挂在 backdrop 内；position:fixed 相对视口，GSAP 写 left/top/width/height -->
      <div
        v-if="originRect && flyCloneActive"
        ref="flyCloneRef"
        class="treasure-detail-fly-clone-root"
        :class="{
          'shop-deck-offer-product-stack': isDeckOffer,
          'treasure-detail-fly-clone-root--voucher-stack': isVoucherOffer && voucherDetailStacked,
        }"
        :style="collectionLockedFlyCloneStyle"
        aria-hidden="true"
      >
        <template v-if="isDeckOffer">
          <LetterTile
            variant="grid"
            class="shop-shelf-letter-tile"
            v-bind="deckOfferLetterTileBind"
          />
          <div class="shop-treasure-price" aria-hidden="true">
            <div
              class="shop-treasure-price-inner"
              :class="[
                { 'shop-treasure-price-inner--pack-struck': mode === 'pack-inner' },
                offerShelfPriceInnerClasses,
              ]"
            >
              ${{ offerPriceDisplayed }}
            </div>
          </div>
        </template>
        <div
          v-else-if="isVoucherOffer && voucherDetailStacked"
          class="voucher-detail-stamp-stack"
        >
          <div
            class="shop-treasure-frame shop-treasure-frame--detail shop-treasure-frame--voucher-stamp voucher-detail-stamp-stack__back"
            aria-hidden="true"
          >
            <span class="shop-treasure-emoji shop-treasure-emoji--detail" role="img">{{
              voucherOwnedTierPanels[0]?.emoji ?? treasure.emoji
            }}</span>
          </div>
          <div
            class="shop-treasure-frame shop-treasure-frame--detail shop-treasure-frame--voucher-stamp voucher-detail-stamp-stack__front"
          >
            <span class="shop-treasure-emoji shop-treasure-emoji--detail" role="img">{{
              voucherOwnedTierPanels[1]?.emoji ?? treasure.emoji
            }}</span>
          </div>
        </div>
        <div
          v-else
          class="shop-treasure-frame shop-treasure-frame--detail"
          :class="{
            'shop-treasure-frame--owned': isOwnedMode,
            'shop-treasure-frame--bundle-pack-detail': isBundlePack,
            'shop-treasure-frame--length-offer':
              treasure?.offerType === 'upgrade' && treasure?.upgradeKind !== 'rarity',
            'shop-treasure-frame--pack-rarity':
              treasure?.offerType === 'upgrade' && treasure?.upgradeKind === 'rarity',
            'shop-treasure-frame--spell-offer': isSpellOffer,
            'shop-treasure-frame--voucher-stamp': isVoucherOffer,
            'shop-treasure-frame--collection-unknown': isCollectionLockedPreview,
            'treasure-detail-frame--charge-inactive': chargeVisualState === 'inactive',
            'treasure-detail-frame--charge-active': chargeVisualState === 'active',
          }"
          :style="{ '--charge-progress': String(chargeProgress ?? 0) }"
        >
          <template v-if="isCollectionLockedPreview">
            <span class="collection-detail-unknown-mark" aria-hidden="true">?</span>
          </template>
          <template v-else-if="isUpgradeOffer">
            <i
              v-if="treasure.iconClass"
              class="shop-treasure-emoji shop-treasure-emoji--detail shop-treasure-emoji--icon"
              :class="treasure.iconClass"
              aria-hidden="true"
            ></i>
            <span v-else class="shop-treasure-emoji shop-treasure-emoji--detail">{{ treasure.emoji }}</span>
            <span
              v-if="isPackRarityUpgrade && (treasure.lengthBadgeLabel || treasure.lengthLabel)"
              class="shop-pack-rarity-caption shop-upgrade-length--detail"
              >{{ treasure.lengthBadgeLabel || treasure.lengthLabel }}</span
            >
            <span
              v-else-if="treasure.lengthBadgeLabel || treasure.lengthLabel"
              class="shop-upgrade-length shop-upgrade-length--detail"
              :class="{
                'shop-upgrade-length--single-digit': isSingleDigitLabel(
                  treasure.lengthBadgeLabel || treasure.lengthLabel,
                ),
              }"
              >{{ treasure.lengthBadgeLabel || treasure.lengthLabel }}</span
            >
          </template>
          <template v-else-if="isVoucherOffer">
            <span class="shop-treasure-emoji shop-treasure-emoji--detail">{{ treasure.emoji }}</span>
          </template>
          <template v-else-if="isSpellOffer">
            <i
              v-if="treasure.iconClass"
              class="shop-treasure-emoji shop-treasure-emoji--detail shop-treasure-emoji--icon"
              :class="treasure.iconClass"
              aria-hidden="true"
            ></i>
          </template>
          <template v-else-if="isBundlePack">
            <i
              class="shop-treasure-emoji shop-treasure-emoji--detail shop-treasure-emoji--icon ri-gift-2-line"
              aria-hidden="true"
            ></i>
            <span class="shop-bundle-pack-caption-detail">{{ bundlePackTypeLabel }}</span>
          </template>
          <template v-else>
            <span class="letter-gem" :class="`gem-${gemRarityKey}`" aria-hidden="true" />
            <i
              v-if="treasure.iconClass"
              class="shop-treasure-emoji shop-treasure-emoji--detail shop-treasure-emoji--icon"
              :class="treasure.iconClass"
              aria-hidden="true"
            ></i>
            <span v-else class="shop-treasure-emoji shop-treasure-emoji--detail">{{ treasure.emoji }}</span>
            <span
              v-if="treasure.lengthBadgeLabel || treasure.lengthLabel"
              class="shop-upgrade-length shop-upgrade-length--detail"
              :class="{
                'shop-upgrade-length--single-digit': isSingleDigitLabel(
                  treasure.lengthBadgeLabel || treasure.lengthLabel,
                ),
              }"
              >{{
              treasure.lengthBadgeLabel || treasure.lengthLabel
            }}</span>
          </template>
          <div
            v-if="accessoryChipVisuals.length"
            class="treasure-accessory-chip-stack treasure-accessory-chip-stack--detail"
            aria-hidden="true"
          >
            <span
              v-for="(chip, chipIx) in accessoryChipVisuals"
              :key="`${chip.chipClass}-${chipIx}`"
              class="treasure-accessory-chip"
              :class="chip.chipClass"
            >
              <span class="treasure-accessory-chip-ripple" aria-hidden="true" />
              <i class="treasure-accessory-chip-icon" :class="chip.iconClass" aria-hidden="true" />
            </span>
          </div>
          <i
            v-if="chargeVisualState != null"
            class="treasure-charge-corner-icon treasure-detail-disabled-mark ri-flashlight-fill"
            aria-hidden="true"
          ></i>
        </div>
        <div v-if="!isDeckOffer && showDetailShelfPrice" class="shop-treasure-price">
          <div
            class="shop-treasure-price-inner"
            :class="[
              { 'shop-treasure-price-inner--pack-struck': mode === 'pack-inner' },
              offerShelfPriceInnerClasses,
            ]"
          >
            {{ detailShelfPriceText }}
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import gsap from "gsap";
import { portalScrimGsapVars } from "../game/portalScrimBleed.js";
import { computed, nextTick, onBeforeUpdate, onMounted, onUnmounted, ref, useId, watch } from "vue";
import { EASE_TRANSFORM } from "../constants.js";
import {
  getTreasureAccessoryChipVisual,
  getTreasureAccessoryChipVisualsFromEntity,
  getTreasureAccessoryPanelTitle,
  getTreasureAccessoryPanelDescription,
} from "../game/treasureAccessories.js";
import { readTreasureAccessoryIds } from "../accessories/accessoryState.js";
import { ownedTreasureHasNoSellAccessory } from "../game/runDifficultyRuntime.js";
import { getTileAccessoryChipVisual } from "../game/tileAccessories.js";
import { getTileMaterialEffectDescription, getTileAccessoryEffectDescription } from "../game/tileDetailDescriptions.js";
import {
  collectExplicitDescriptionConceptPanelsFromMany,
  getTileAccessoryLinkedConceptPanels,
} from "../game/gameConceptCopy.js";
import { resolveTreasureDetailGainPanel } from "../treasures/treasureRegistry.js";
import { resolveTreasureUnlockPrerequisitePanel } from "../treasures/treasureUnlockPrerequisiteCopy.js";
import { getSpellGainPanel } from "../spells/spellGainPanel.js";
import { getSpellDefinition, getSpellShopPrice } from "../spells/spellDefinitions.js";
import ShopSpellShelfCell from "./ShopSpellShelfCell.vue";
import TreasureDescRichText from "./TreasureDescRichText.vue";
import LetterTile from "./LetterTile.vue";
import { bumpOverlayZ } from "../game/overlayStack.js";
import { scheduleOverlayDismiss, schedulePreviewLayerPresent, triggerHaptic } from "../platform/haptics.js";
import { createBackdropSelfCloseGuard } from "../game/backdropSelfCloseGuard.js";
import {
  instantPortalLayerClose,
  instantPortalLayerEnter,
  instantRevealGsapTargets,
  shouldSkipDecorativeMotion,
} from "../settings/animationSpeed.js";
import {
  buildPackInnerOfferPriceView,
  buildShopOfferPriceView,
  resolveShopOfferEffectivePrice,
} from "../shop/shopOfferPriceDisplay.js";
import {
  formatShopRandomSaleDescription,
  readOfferRandomSaleDiscount,
  SHOP_RANDOM_SALE_TITLE,
} from "../shop/shopRandomSale.js";
import {
  formatShopVoucherSaleDescription,
  readOfferVoucherSaleDiscountAmount,
  SHOP_VOUCHER_SALE_TITLE,
} from "../shop/shopVoucherSale.js";
import {
  readOfferPresetSaleDiscount,
  SHOP_PRESET_SALE_TITLE,
} from "../game/runPresetRuntime.js";
import {
  SHOP_SPELL_GRANTED_VOUCHER_PANEL_DESCRIPTION,
  SHOP_SPELL_GRANTED_VOUCHER_PANEL_TITLE,
} from "../vouchers/shopVoucherOfferBuild.js";
import {
  buildUpgradeOfferPreviewGainRows,
  upgradeOfferPreviewHasDecimalGains,
  UPGRADE_PREVIEW_ROUNDING_RULES_TEXT,
} from "../shop/upgradeOfferPreviewGains.js";
import {
  getPerLetterIntrinsicMultDisplay,
  getPerLetterIntrinsicScoreDisplay,
  getRarityForLetter,
  shouldShowTileDetailRarityScoreMult,
} from "../composables/useScoring.js";
import {
  tileDetailLayerCopy,
  getTileDetailRarityTierLabel,
  getTileDetailMaterialTitle,
  getTileDetailAccessoryTitle,
} from "../game/tileDetailLayerCopy.js";
import { formatCompactOneDecimal, formatWalletInteger, isSingleDigitLabel } from "./detailLayerFormatters.js";
import { buildPackDeckOfferLetterTileProps } from "../game/packDeckOfferVisual.js";
import { resolveLetterFromRaw } from "../settings/letterQ.js";
import PreviewGroupNav from "./PreviewGroupNav.vue";
import CollectionPrerequisiteBadge from "./collection/CollectionPrerequisiteBadge.vue";
import { COLLECTION_UNKNOWN_LABEL } from "../collection/collectionDisplayUtils.js";
import { resolveCollectionUnlockHintPanel } from "../collection/collectionUnlockHintCopy.js";
import {
  collectionEntryOpacityForState,
  isCollectionEntryLocked,
} from "../collection/collectionEntryState.js";

const props = defineProps({
  treasure: { type: Object, required: true },
  /** 非 null 时替换简介（如篮球动态括号行） */
  descriptionOverride: { type: [Array, String], default: null },
  mode: { type: String, required: true },
  /** null | inactive | active（由拥有槽位状态透传） */
  chargeVisualState: { type: String, default: null },
  /** 0~1 充能进度（由拥有槽位状态透传） */
  chargeProgress: { type: Number, default: 0 },
  walletAmount: { type: Number, default: 0 },
  sellRefund: { type: Number, default: 0 },
  canBuyOffer: { type: Boolean, default: false },
  packInnerAlreadyClaimed: { type: Boolean, default: false },
  /** @type {{ left: number, top: number, width: number, height: number } | null} */
  originRect: { type: Object, default: null },
  /** 法术「重播」预览用：上一张可重播法术 id */
  spellReplayTargetSpellId: { type: String, default: null },
  /** 已拥有优惠券 id（商店内标价折扣用） */
  ownedVoucherIds: { type: Array, default: () => [] },
  /** 本局预设 id（商店标价） */
  runPresetId: { type: String, default: "preset_01" },
  /** 钱包下限（价签「买不起」着色） */
  walletFloor: { type: Number, default: 0 },
  overlaySuppressed: { type: Boolean, default: false },
  /** 字母块预览：分数×倍率与 TileDetailLayer 一致 */
  rarityLevelsByRarity: { type: Object, default: null },
  /** 已拥有打字机时宝藏简介概率显示翻倍 */
  probabilityDisplayDoubled: { type: Boolean, default: false },
  /** 骰子/重播释法：主按钮为「使用」（绿），非商店购买 */
  spellGrantFlow: { type: Boolean, default: false },
  /** null=按 mode 推断；offer=货架标价（收藏图鉴）；sell=卖出价 */
  shelfPriceKind: {
    type: String,
    default: null,
    validator: (v) => v == null || v === "offer" || v === "sell",
  },
  /** 同组预览翻页：0-based 下标 */
  previewNavIndex: { type: Number, default: 0 },
  /** 同组项总数；≤1 时不显示翻页 */
  previewNavTotal: { type: Number, default: 0 },
  /** 收藏图鉴：discovered | unknown | prerequisite-locked */
  collectionEntryState: {
    type: String,
    default: "discovered",
    validator: (v) => v === "discovered" || v === "unknown" || v === "prerequisite-locked",
  },
});

const isCollectionPreviewMode = computed(() => props.mode === "collection-preview");

const isCollectionLockedPreview = computed(
  () => isCollectionPreviewMode.value && isCollectionEntryLocked(props.collectionEntryState),
);

const collectionLockedVisualStyle = computed(() => {
  if (!isCollectionLockedPreview.value) return undefined;
  return { opacity: String(collectionEntryOpacityForState(props.collectionEntryState)) };
});

const detailShelfPriceText = computed(() => {
  if (isCollectionLockedPreview.value) return "$?";
  if (props.shelfPriceKind === "sell" || (props.shelfPriceKind == null && isOwnedMode.value)) {
    return `$${props.sellRefund}`;
  }
  return `$${offerPriceDisplayed.value}`;
});

const showDetailShelfPrice = computed(() => {
  if (props.shelfPriceKind === "offer" || props.shelfPriceKind === "sell") return true;
  if (isCollectionPreviewMode.value) return false;
  return props.mode !== "voucher-owned";
});

const offerPriceDisplayed = computed(() => {
  const base = Math.max(0, Math.floor(Number(props.treasure?.price) || 0));
  if (isCollectionPreviewMode.value || props.shelfPriceKind === "offer" || props.mode === "pack-inner") {
    return base;
  }
  return resolveShopOfferEffectivePrice(
    base,
    props.treasure ?? {},
    props.ownedVoucherIds ?? [],
    props.runPresetId,
  );
});

const offerShelfPriceView = computed(() => {
  const base = Math.max(0, Math.floor(Number(props.treasure?.price) || 0));
  if (props.mode === "pack-inner") {
    return buildPackInnerOfferPriceView(base);
  }
  return buildShopOfferPriceView(base, props.treasure ?? {}, {
    wallet: props.walletAmount,
    ownedVoucherIds: props.ownedVoucherIds ?? [],
    runPresetId: props.runPresetId,
    walletFloor: props.walletFloor,
  });
});

const offerShelfPriceInnerClasses = computed(() => {
  if (props.shelfPriceKind === "sell" || (props.shelfPriceKind == null && isOwnedMode.value)) {
    return {};
  }
  if (isCollectionLockedPreview.value) return {};
  return offerShelfPriceView.value.innerClasses;
});

const voucherSaleDiscountAmount = computed(() =>
  readOfferVoucherSaleDiscountAmount(
    Math.max(0, Math.floor(Number(props.treasure?.price) || 0)),
    props.treasure,
    props.ownedVoucherIds ?? [],
    props.runPresetId,
  ),
);

const showVoucherSalePanel = computed(
  () =>
    props.mode === "offer" &&
    !isCollectionPreviewMode.value &&
    voucherSaleDiscountAmount.value > 0,
);

const voucherSalePanelDescription = computed(() =>
  formatShopVoucherSaleDescription(props.ownedVoucherIds ?? [], voucherSaleDiscountAmount.value),
);

const randomSaleDiscountAmount = computed(() => readOfferRandomSaleDiscount(props.treasure));

const presetSaleDiscountAmount = computed(() =>
  readOfferPresetSaleDiscount(props.treasure, props.runPresetId),
);

const showPresetSalePanel = computed(
  () =>
    props.mode === "offer" &&
    !isCollectionPreviewMode.value &&
    presetSaleDiscountAmount.value > 0,
);

const showRandomSalePanel = computed(
  () =>
    props.mode === "offer" &&
    !isCollectionPreviewMode.value &&
    randomSaleDiscountAmount.value > 0,
);

const showSpellGrantedVoucherPanel = computed(
  () =>
    props.mode === "offer" &&
    !isCollectionPreviewMode.value &&
    isVoucherOffer.value &&
    props.treasure?.spellGranted === true,
);

const presetSalePanelDescription = computed(() =>
  formatShopRandomSaleDescription(presetSaleDiscountAmount.value),
);

const randomSalePanelDescription = computed(() =>
  formatShopRandomSaleDescription(randomSaleDiscountAmount.value),
);

const hasTreasureDescBody = computed(() => {
  const raw = props.descriptionOverride ?? props.treasure?.description;
  if (raw == null) return false;
  if (Array.isArray(raw)) return raw.length > 0;
  return String(raw).trim().length > 0;
});

const isOwnedMode = computed(() => props.mode === "owned-shop" || props.mode === "owned-game");
const sellBlockedByNoSell = computed(
  () => isOwnedMode.value && ownedTreasureHasNoSellAccessory(props.treasure),
);
const sellEnabled = computed(() => isOwnedMode.value && !sellBlockedByNoSell.value);

/** 局内棋盘打开宝藏详情（owned-game）不重复显示余额，与主界面顶栏一致 */
const showHeaderWallet = computed(
  () => props.mode === "offer" || props.mode === "owned-shop" || props.mode === "pack-inner",
);

const isDeckOffer = computed(
  () => props.treasure?.offerType === "deckTile" || props.treasure?.offerType === "deckLetter",
);

/** 包内字母块：飞入详情时 tile + 价签整列同步位移 */
const isPackInnerDeckOfferFly = computed(
  () => props.mode === "pack-inner" && isDeckOffer.value,
);

const deckOfferLetterTileBind = computed(() => {
  const p = buildPackDeckOfferLetterTileProps(props.treasure);
  if (!p) {
    const raw = String(props.treasure?.deckLetterRaw ?? "a").toLowerCase();
    return {
      letter: resolveLetterFromRaw(raw),
      rarity: props.treasure?.letterRarity ?? props.treasure?.rarity ?? "common",
      tileScoreBonus: 0,
      tileMultBonus: 0,
    };
  }
  return {
    letter: p.letter,
    rarity: p.rarity,
    materialId: p.materialId ?? undefined,
    accessoryId: p.accessoryId ?? undefined,
    treasureAccessoryId: p.treasureAccessoryId ?? undefined,
    tileScoreBonus: p.tileScoreBonus,
    tileMultBonus: p.tileMultBonus,
  };
});

const showDeckOfferRarityScoreMult = computed(() =>
  shouldShowTileDetailRarityScoreMult(deckOfferLetterTileBind.value),
);

const deckOfferLetter = computed(() => {
  const raw = String(props.treasure?.deckLetterRaw ?? "a").toLowerCase();
  return resolveLetterFromRaw(raw);
});

const deckOfferAccessoryId = computed(() => {
  if (props.treasure?.offerType !== "deckTile") return undefined;
  const id = props.treasure?.deckTileAccessoryId;
  const s = id != null ? String(id).trim() : "";
  return s || undefined;
});

const deckOfferTreasureAccessoryId = computed(() => {
  if (props.treasure?.offerType !== "deckTile") return undefined;
  const id = props.treasure?.deckTileTreasureAccessoryId;
  const s = id != null ? String(id).trim() : "";
  return s || undefined;
});

const offerTreasureAccessoryIds = computed(() => {
  if (props.treasure?.offerType === "deckTile") {
    const id = deckOfferTreasureAccessoryId.value;
    return id ? [id] : [];
  }
  return readTreasureAccessoryIds(props.treasure);
});

const accessoryChipVisuals = computed(() => getTreasureAccessoryChipVisualsFromEntity(props.treasure));

const treasureAccessoryPanels = computed(() =>
  offerTreasureAccessoryIds.value
    .map((id) => ({
      id,
      chip: getTreasureAccessoryChipVisual(id),
      title: getTreasureAccessoryPanelTitle(id),
      body: getTreasureAccessoryPanelDescription(id),
    }))
    .filter((p) => Boolean(String(p.body ?? "").trim())),
);

const showTreasureAccessoryPanels = computed(
  () => !isDeckOffer.value && !isCollectionLockedPreview.value && treasureAccessoryPanels.value.length > 0,
);

const deckOfferRarityKey = computed(() => {
  const raw = String(props.treasure?.deckLetterRaw ?? "").toLowerCase();
  const fromLetter = raw ? getRarityForLetter(raw === "qu" ? "q" : raw) : "";
  const r = String(props.treasure?.letterRarity ?? props.treasure?.rarity ?? (fromLetter || "common"));
  if (r === "rare" || r === "epic" || r === "legendary") return r;
  return "common";
});

const deckOfferRarityTagLabel = computed(() => getTileDetailRarityTierLabel(deckOfferRarityKey.value));

const formatDeckOfferMultDisplay = formatCompactOneDecimal;

const deckOfferScoreDisplay = computed(() => {
  const n = getPerLetterIntrinsicScoreDisplay(deckOfferRarityKey.value, props.rarityLevelsByRarity);
  return String(Math.max(0, Math.round(n)));
});

const deckOfferMultDisplay = computed(() => {
  const n = getPerLetterIntrinsicMultDisplay(deckOfferRarityKey.value, props.rarityLevelsByRarity);
  return formatDeckOfferMultDisplay(n);
});

const deckOfferScoreMultAria = computed(() =>
  tileDetailLayerCopy.rarity.formatTotalPerLetterAria(deckOfferScoreDisplay.value, deckOfferMultDisplay.value),
);

const deckOfferMaterialIdNorm = computed(() => {
  if (props.treasure?.offerType !== "deckTile") return "";
  const id = props.treasure?.deckTileMaterialId;
  return id != null ? String(id).trim() : "";
});

const deckOfferMaterialDesc = computed(() =>
  getTileMaterialEffectDescription(deckOfferMaterialIdNorm.value || null),
);

const deckOfferMaterialTitle = computed(() =>
  getTileDetailMaterialTitle(deckOfferMaterialIdNorm.value || null),
);

const deckOfferMaterialEffectText = computed(() => deckOfferMaterialDesc.value || "");

const showDeckOfferMaterialRegion = computed(
  () => Boolean(deckOfferMaterialIdNorm.value && String(deckOfferMaterialEffectText.value ?? "").trim()),
);

const deckOfferAccessoryIdNorm = computed(() => {
  const id = deckOfferAccessoryId.value;
  return id != null ? String(id).trim() : "";
});

const deckOfferAccessoryDesc = computed(() =>
  getTileAccessoryEffectDescription(deckOfferAccessoryIdNorm.value || null),
);

const deckOfferAccessoryTitle = computed(() =>
  getTileDetailAccessoryTitle(deckOfferAccessoryIdNorm.value || null),
);

const deckOfferTileAccessoryChipVisual = computed(() =>
  getTileAccessoryChipVisual(deckOfferAccessoryId.value),
);

const showDeckOfferAccessoryRegion = computed(
  () => Boolean(deckOfferAccessoryIdNorm.value && deckOfferAccessoryDesc.value),
);
const deckOfferAccessoryLinkedConceptPanels = computed(() =>
  showDeckOfferAccessoryRegion.value ? getTileAccessoryLinkedConceptPanels(deckOfferAccessoryIdNorm.value) : [],
);

const deckOfferTreasureAccessoryIdNorm = computed(() => {
  const id = deckOfferTreasureAccessoryId.value;
  return id != null ? String(id).trim() : "";
});

const deckOfferTreasureAccessoryTitle = computed(() =>
  getTreasureAccessoryPanelTitle(deckOfferTreasureAccessoryIdNorm.value || null),
);

const deckOfferTreasureAccessoryDesc = computed(() =>
  getTreasureAccessoryPanelDescription(deckOfferTreasureAccessoryIdNorm.value || null),
);

const deckOfferTreasureAccessoryChipVisual = computed(() =>
  getTreasureAccessoryChipVisual(deckOfferTreasureAccessoryIdNorm.value || null),
);

const showDeckOfferTreasureAccessoryRegion = computed(() =>
  Boolean(String(deckOfferTreasureAccessoryDesc.value ?? "").trim()),
);

const packInnerPrimaryLabel = computed(() => {
  if (props.packInnerAlreadyClaimed) return "已获取";
  if (props.treasure?.offerType === "upgrade") return "使用";
  return "获取";
});

const rarityTagLabel = computed(() => {
  const lr = props.treasure?.letterRarity;
  if (lr === "common") return "普通";
  if (lr === "rare") return "稀有";
  if (lr === "epic") return "史诗";
  if (lr === "legendary") return "传说";
  const r = props.treasure?.rarity;
  if (r === "epic") return "史诗";
  if (r === "legendary") return "传说";
  if (r === "common") return "普通";
  return "稀有";
});

/** 保证标题行在首帧即有占位高度，避免 flex 测量时 targetVisual 上移 */
const displayTreasureName = computed(() => {
  if (isCollectionLockedPreview.value) return COLLECTION_UNKNOWN_LABEL;
  const n = props.treasure?.name;
  if (n == null || String(n).trim() === "") return "\u00a0";
  return String(n);
});

/** 与 LetterTile / grid-tile .letter-gem 的 gem-* 一致 */
const gemRarityKey = computed(() => {
  const lr = props.treasure?.letterRarity;
  if (lr === "epic" || lr === "legendary" || lr === "common" || lr === "rare") return lr;
  const r = props.treasure?.rarity;
  if (r === "epic") return "epic";
  if (r === "legendary") return "legendary";
  if (r === "common") return "common";
  return "rare";
});

const isUpgradeOffer = computed(() => props.treasure?.offerType === "upgrade");

const upgradePreviewGainRows = computed(() =>
  isUpgradeOffer.value ? buildUpgradeOfferPreviewGainRows(props.treasure) : [],
);

const showUpgradePreviewGainRows = computed(
  () => !isCollectionLockedPreview.value && upgradePreviewGainRows.value.length > 0,
);

const showUpgradeRoundingRulesPanel = computed(
  () =>
    showUpgradePreviewGainRows.value &&
    upgradeOfferPreviewHasDecimalGains(upgradePreviewGainRows.value),
);

const upgradeRoundingRulesText = UPGRADE_PREVIEW_ROUNDING_RULES_TEXT;

/** @param {import('../shop/upgradeOfferPreviewGains.js').UpgradePreviewGainRow} row */
function formatUpgradePreviewGainAria(row) {
  return tileDetailLayerCopy.rarity.formatTotalPerLetterAria(row.scoreDisplay, row.multDisplay);
}

const isPackRarityUpgrade = computed(
  () => isUpgradeOffer.value && props.treasure?.upgradeKind === "rarity",
);

const isSpellOffer = computed(() => props.treasure?.offerType === "spell");

const isRestartSpellOffer = computed(
  () => isSpellOffer.value && String(props.treasure?.spellId ?? "") === "restart",
);

const showSpellReplayTargetRow = computed(
  () => isRestartSpellOffer.value && Boolean(String(props.spellReplayTargetSpellId ?? "").trim()),
);

const spellReplayTargetDef = computed(() => {
  const id = String(props.spellReplayTargetSpellId ?? "").trim();
  return id ? getSpellDefinition(id) : null;
});

const spellReplayTargetName = computed(() => spellReplayTargetDef.value?.name ?? "");
const spellReplayTargetIconClass = computed(
  () => spellReplayTargetDef.value?.iconClass ?? "ri-magic-fill",
);
const spellReplayTargetPrice = computed(() =>
  spellReplayTargetDef.value ? getSpellShopPrice(spellReplayTargetDef.value) : 0,
);

const isBundlePack = computed(() => props.treasure?.offerType === "bundlePack");

const isVoucherOffer = computed(() => props.treasure?.offerType === "voucher");

const isVoucherOwnedMode = computed(() => props.mode === "voucher-owned");

/** 入场 stagger 用；非响应式，避免模板 :ref 回调写 ref 触发无限重渲染 */
/** @type {(HTMLElement | null)[]} */
const voucherTierPanelRefs = [];

/** @param {number} i @param {unknown} el */
function setVoucherTierPanelRef(i, el) {
  voucherTierPanelRefs[i] = el instanceof HTMLElement ? el : null;
}

const voucherOwnedTierPanels = computed(() => {
  if (!isVoucherOffer.value) return [];
  const tiers = props.treasure?.ownedVoucherTiers;
  if (!Array.isArray(tiers) || tiers.length < 2) return [];
  return tiers;
});

const voucherDetailStacked = computed(() => voucherOwnedTierPanels.value.length >= 2);

const showVoucherTierPanels = computed(() => voucherOwnedTierPanels.value.length >= 2);

const showMainVoucherDesc = computed(() => !showVoucherTierPanels.value);

const showTreasureMainDescCard = computed(() => {
  if (isCollectionLockedPreview.value) return false;
  if (isDeckOffer.value) return showDeckOfferRarityScoreMult.value;
  if (isVoucherOffer.value && showVoucherTierPanels.value) return false;
  if (showSpellReplayTargetRow.value) return true;
  if (showDetailRarityTag.value) return true;
  if (showUpgradePreviewGainRows.value) return true;
  if (hasTreasureDescBody.value) {
    return !isVoucherOffer.value || showMainVoucherDesc.value;
  }
  return false;
});

const bundlePackTypeLabel = computed(() => {
  if (!isBundlePack.value) return "";
  const k = String(props.treasure?.bundleKind ?? "");
  if (k === "spell") return "法术";
  if (k === "upgrade") return "升级";
  if (k === "treasure") return "宝藏";
  if (k === "tile") return "字母";
  return "组合包";
});

/** 与法术选格层、商店货架详情一致：名称上一行淡淡分类 */
const detailKindCaption = computed(() => {
  if (isBundlePack.value) return "组合包";
  if (isVoucherOffer.value) return "优惠券";
  if (isSpellOffer.value) return "法术卡";
  if (isDeckOffer.value) return "字母块";
  if (props.treasure?.offerType === "upgrade") return "升级卡";
  return "宝藏";
});

/** 牌包「升级卡」无宝藏稀有度，描述框不展示价签式稀有度 tag */
const showDetailRarityTag = computed(
  () =>
    !isCollectionLockedPreview.value &&
    props.treasure?.offerType !== "upgrade" &&
    props.treasure?.offerType !== "bundlePack" &&
    props.treasure?.offerType !== "voucher",
);

const spellGainPanelContent = computed(() => {
  if (!isSpellOffer.value) return null;
  const sid = String(props.treasure?.spellId ?? "").trim();
  if (!sid) return null;
  return getSpellGainPanel(sid, { replayTargetSpellId: props.spellReplayTargetSpellId ?? null });
});

const showSpellGainPanel = computed(
  () =>
    !isCollectionLockedPreview.value &&
    Boolean(String(spellGainPanelContent.value?.description ?? "").trim()),
);

const treasureGainPanelContent = computed(() => {
  if (isSpellOffer.value) return null;
  if (props.treasure?.offerType === "upgrade") return null;
  if (props.treasure?.offerType === "bundlePack") return null;
  if (isVoucherOffer.value) return null;
  const tid = String(props.treasure?.treasureId ?? "").trim();
  if (!tid) return null;
  return resolveTreasureDetailGainPanel(tid);
});

function treasureGainDescriptionNonEmpty(desc) {
  if (desc == null) return false;
  if (typeof desc === "string") return String(desc).trim().length > 0;
  return Array.isArray(desc) && desc.length > 0;
}

const collectionUnlockHintPanel = computed(() => {
  if (!isCollectionPreviewMode.value || !isCollectionLockedPreview.value) return null;
  return resolveCollectionUnlockHintPanel(props.treasure);
});

const showCollectionUnlockHintPanel = computed(
  () =>
    isCollectionPreviewMode.value &&
    isCollectionLockedPreview.value &&
    treasureGainDescriptionNonEmpty(collectionUnlockHintPanel.value?.description),
);

const collectionUnlockPrerequisitePanel = computed(() => {
  if (!isCollectionPreviewMode.value) return null;
  if (
    isSpellOffer.value ||
    isUpgradeOffer.value ||
    isVoucherOffer.value ||
    isDeckOffer.value ||
    isBundlePack.value
  ) {
    return null;
  }
  const tid = String(props.treasure?.treasureId ?? "").trim();
  if (!tid) return null;
  return resolveTreasureUnlockPrerequisitePanel(tid);
});

const showCollectionUnlockPrerequisitePanel = computed(() => {
  if (!isCollectionPreviewMode.value) return false;
  if (
    isSpellOffer.value ||
    isUpgradeOffer.value ||
    isVoucherOffer.value ||
    isDeckOffer.value ||
    isBundlePack.value
  ) {
    return false;
  }
  const panel = collectionUnlockPrerequisitePanel.value;
  if (!treasureGainDescriptionNonEmpty(panel?.description)) return false;
  if (isCollectionLockedPreview.value) {
    return props.collectionEntryState === "prerequisite-locked";
  }
  return true;
});

const showTreasureGainPanel = computed(
  () =>
    !isCollectionLockedPreview.value &&
    Boolean(treasureGainPanelContent.value?.title) &&
    treasureGainDescriptionNonEmpty(treasureGainPanelContent.value?.description),
);

function descriptionConceptExcludeTitles() {
  const exclude = new Set();
  const tg = treasureGainPanelContent.value?.title;
  if (tg) exclude.add(tg);
  const sg = spellGainPanelContent.value?.title;
  if (sg) exclude.add(sg);
  const ta = treasureAccessoryPanels.value.map((p) => p.title).filter(Boolean);
  for (const t of ta) exclude.add(t);
  if (showDeckOfferMaterialRegion.value && deckOfferMaterialTitle.value) {
    exclude.add(deckOfferMaterialTitle.value);
  }
  if (showDeckOfferAccessoryRegion.value && deckOfferAccessoryTitle.value) {
    exclude.add(deckOfferAccessoryTitle.value);
  }
  if (showDeckOfferTreasureAccessoryRegion.value && deckOfferTreasureAccessoryTitle.value) {
    exclude.add(deckOfferTreasureAccessoryTitle.value);
  }
  if (showVoucherSalePanel.value) exclude.add(SHOP_VOUCHER_SALE_TITLE);
  if (showPresetSalePanel.value) exclude.add(SHOP_PRESET_SALE_TITLE);
  if (showRandomSalePanel.value) exclude.add(SHOP_RANDOM_SALE_TITLE);
  if (showSpellGrantedVoucherPanel.value) exclude.add(SHOP_SPELL_GRANTED_VOUCHER_PANEL_TITLE);
  return exclude;
}

const descriptionConceptPanels = computed(() => {
  if (isDeckOffer.value || isCollectionLockedPreview.value) return [];
  /** @type {unknown[]} */
  const sources = [];
  if (isVoucherOffer.value) {
    const tiers = voucherOwnedTierPanels.value;
    if (tiers.length) {
      for (const tier of tiers) {
        if (tier?.description) sources.push(tier.description);
      }
    } else {
      const d = props.descriptionOverride ?? props.treasure?.description;
      if (d) sources.push(d);
    }
  } else {
    const d = props.descriptionOverride ?? props.treasure?.description;
    if (d) sources.push(d);
  }
  return collectExplicitDescriptionConceptPanelsFromMany(sources, descriptionConceptExcludeTitles());
});

/** @type {(HTMLElement | null)[]} */
const descriptionConceptPanelRefs = [];

/** @param {number} i @param {unknown} el */
function setDescriptionConceptPanelRef(i, el) {
  descriptionConceptPanelRefs[i] = el instanceof HTMLElement ? el : null;
}

onBeforeUpdate(() => {
  voucherTierPanelRefs.length = 0;
  descriptionConceptPanelRefs.length = 0;
});

const emit = defineEmits(["close", "purchase", "sell", "openSpellReplayTargetPreview", "preview-nav"]);

const titleId = useId();
const backdropRef = ref(null);
const stackZ = ref(0);
const backdropStackStyle = computed(() => (stackZ.value > 0 ? { zIndex: stackZ.value } : undefined));
const iconColumnRef = ref(null);
const targetVisualRef = ref(null);
const detailFlyFrameRef = ref(null);
const flyCloneRef = ref(null);
const emojiRef = ref(null);
const walletBoxRef = ref(null);
const nameRef = ref(null);
const descRef = ref(null);
const upgradeRoundingRulesPanelRef = ref(null);
const deckOfferMaterialRef = ref(null);
const deckOfferAccessoryRef = ref(null);
const deckOfferTreasureAccessoryRef = ref(null);
const deckOfferStackRef = ref(null);
const spellGainPanelRef = ref(null);
const treasureGainPanelRef = ref(null);
const voucherSalePanelRef = ref(null);
const randomSalePanelRef = ref(null);
const presetSalePanelRef = ref(null);
const spellGrantedVoucherPanelRef = ref(null);
const collectionUnlockHintPanelRef = ref(null);
const collectionUnlockPrerequisitePanelRef = ref(null);
const accessoryPanelRef = ref(null);
const actionsRef = ref(null);
const titleGroupRef = ref(null);

const closing = ref(false);
const bootMask = ref(true);
/** @type {Promise<void> | null} */
let closeFlightPromise = null;

const backdropSelfCloseGuard = createBackdropSelfCloseGuard();

function armBackdropSelfCloseGuard() {
  backdropSelfCloseGuard.arm();
}

function onBackdropSelfClick() {
  backdropSelfCloseGuard.onBackdropSelfClick(requestClose);
}

/** @type {gsap.core.Timeline | null} */
let enterTl = null;

function formatWallet(n) {
  return Number(formatWalletInteger(n)).toLocaleString();
}

function staggerTargets() {
  return [
    titleGroupRef.value,
    descRef.value,
    upgradeRoundingRulesPanelRef.value,
    ...voucherTierPanelRefs.filter((el) => el instanceof HTMLElement),
    deckOfferMaterialRef.value,
    deckOfferAccessoryRef.value,
    deckOfferTreasureAccessoryRef.value,
    treasureGainPanelRef.value,
    voucherSalePanelRef.value,
    presetSalePanelRef.value,
    randomSalePanelRef.value,
    spellGrantedVoucherPanelRef.value,
    collectionUnlockHintPanelRef.value,
    collectionUnlockPrerequisitePanelRef.value,
    spellGainPanelRef.value,
    ...descriptionConceptPanelRefs.filter((el) => el instanceof HTMLElement),
    accessoryPanelRef.value,
    actionsRef.value,
  ].filter(Boolean);
}

/** 克隆用 position:fixed + 视口坐标，不做 backdrop 相对换算 */

function validOrigin(r) {
  return (
    r &&
    typeof r.left === "number" &&
    typeof r.top === "number" &&
    r.width > 2 &&
    r.height > 2
  );
}

/** @param {DOMRect | { left: number, top: number, width: number, height: number }} r */
function rectToFlyBox(r) {
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

/** @param {{ left: number, top: number, width: number, height: number }} r */
function rectCenter(r) {
  return { x: r.left + r.width * 0.5, y: r.top + r.height * 0.5 };
}

/** @param {unknown} refVal */
function refToFlyFrameEl(refVal) {
  if (!refVal) return null;
  if (refVal instanceof HTMLElement) return refVal;
  const el = /** @type {{ $el?: unknown }} */ (refVal).$el;
  return el instanceof HTMLElement ? el : null;
}

/** 详情 icon 框（不含价签列）；宝藏/优惠券/牌包飞入终点与 emoji 缩放均以此为准 */
function resolveDetailFlyFrameRect() {
  const frame = refToFlyFrameEl(detailFlyFrameRef.value);
  const r = frame?.getBoundingClientRect?.();
  if (r && r.width > 2 && r.height > 2) return rectToFlyBox(r);
  return null;
}

/** 货架字母块飞入：tile + 价签整列 */
function resolveDeckOfferFlyTargetRect() {
  const stack = refToFlyFrameEl(deckOfferStackRef.value);
  const r = stack?.getBoundingClientRect?.();
  if (r && r.width > 2 && r.height > 2) return rectToFlyBox(r);
  const frameRect = resolveDetailFlyFrameRect();
  if (frameRect) return frameRect;
  const visual = targetVisualRef.value;
  const vr = visual?.getBoundingClientRect?.();
  if (vr && vr.width > 2 && vr.height > 2) return rectToFlyBox(vr);
  return null;
}

const flyCloneActive = ref(validOrigin(props.originRect));
const initialEnterDone = ref(false);
const previewNavRef = ref(null);

/** 首帧即落在起点，避免未定位前露在错误位置；显隐由 CSS visibility + RAF 内 GSAP 接管 */
const flyCloneStyle = computed(() => {
  const r = props.originRect;
  if (!validOrigin(r)) {
    return {
      position: "fixed",
      left: "-9999px",
      top: "0",
      width: "1px",
      height: "1px",
      zIndex: 9999,
      boxSizing: "border-box",
      margin: "0",
      pointerEvents: "none",
    };
  }
  return {
    position: "fixed",
    left: `${r.left}px`,
    top: `${r.top}px`,
    width: `${r.width}px`,
    height: `${r.height}px`,
    zIndex: 9999,
    boxSizing: "border-box",
    margin: "0",
  };
});

const collectionLockedFlyCloneStyle = computed(() => ({
  ...flyCloneStyle.value,
  ...(collectionLockedVisualStyle.value ?? {}),
}));

/**
 * @param {HTMLElement} backdrop
 * @param {HTMLElement[]} staggerEls
 * @param {HTMLElement | null} targetVisual
 * @param {boolean} resetBackdrop
 */
function applyEnterInitialHide(backdrop, staggerEls, targetVisual, resetBackdrop = true) {
  const iconColumn = iconColumnRef.value;
  gsap.killTweensOf([targetVisual, iconColumn, ...staggerEls].filter(Boolean));
  if (resetBackdrop) {
    gsap.killTweensOf(backdrop);
    gsap.set(backdrop, portalScrimGsapVars("rgba(14, 12, 10, 0)"));
  }
  gsap.set(staggerEls, { opacity: 0, y: 7 });
  /* boot 解除后 icon 列易先亮一帧，与 SpellTargetLayer 同样先写 GSAP */
  if (iconColumn) {
    gsap.set(iconColumn, { opacity: 0, pointerEvents: "none" });
  }
  if (targetVisual) {
    gsap.set(targetVisual, {
      opacity: 0,
      visibility: "hidden",
      pointerEvents: "none",
    });
  }
}

function runEnterAnimation() {
  const backdrop = backdropRef.value;
  const targetVisual = targetVisualRef.value;
  if (!backdrop || !targetVisual) return;

  if (shouldSkipDecorativeMotion()) {
    if (enterTl) {
      enterTl.kill();
      enterTl = null;
    }
    bootMask.value = false;
    flyCloneActive.value = false;
    instantPortalLayerEnter({
      backdrop,
      backdropFinal: portalScrimGsapVars("rgba(14, 12, 10, 0.78)"),
      staggerEls: staggerTargets(),
      primaryEl: targetVisual,
      extraEls: [iconColumnRef.value].filter(Boolean),
    });
    void nextTick(() => {
      previewNavRef.value?.resetVisible?.();
    });
    initialEnterDone.value = true;
    return;
  }

  if (enterTl) {
    enterTl.kill();
    enterTl = null;
  }

  const staggerEls = staggerTargets();

  gsap.killTweensOf([
    backdrop,
    targetVisual,
    iconColumnRef.value,
    flyCloneRef.value,
    ...staggerEls,
    ...(previewNavRef.value?.getAnimTargets?.() ?? []),
  ].filter(Boolean));

  bootMask.value = true;
  applyEnterInitialHide(backdrop, staggerEls, targetVisual);

  /* 遮罩与测量解耦：立刻从透明匀缓加深，避免等字体/RAF 后再起 tween 像闪一下 */
  gsap.fromTo(
    backdrop,
    portalScrimGsapVars("rgba(14, 12, 10, 0)"),
    {
      ...portalScrimGsapVars("rgba(14, 12, 10, 0.78)"),
      duration: 0.42,
      ease: EASE_TRANSFORM,
    },
  );

  void nextTick()
    .then(() => (document.fonts?.ready != null ? document.fonts.ready : Promise.resolve()))
    .then(
      () =>
        new Promise((r) => {
          requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r)));
        }),
    )
    .then(() => {
      const backdropLive = backdropRef.value;
      const targetVisualLive = targetVisualRef.value;
      const iconColumnLive = iconColumnRef.value;
      if (!backdropLive || !targetVisualLive) return;

      const staggerLive = staggerTargets();
      /* 二次重置仅处理子块；保留 backdrop 正在进行的渐变，避免瞬间跳黑 */
      applyEnterInitialHide(backdropLive, staggerLive, targetVisualLive, false);

      if (props.previewNavTotal > 1) {
        previewNavRef.value?.applyEnterInitialHide?.();
      }

      const originOk = validOrigin(props.originRect);
      let cloneLive = flyCloneRef.value;
      if (originOk && !cloneLive) {
        flyCloneActive.value = true;
      }
      if (originOk && !cloneLive) {
        return new Promise((r) => requestAnimationFrame(r)).then(() => {
          cloneLive = flyCloneRef.value;
          if (!backdropRef.value || !targetVisualRef.value) return;
          continueEnterAfterMeasure({
            backdropLive: backdropRef.value,
            targetVisualLive: targetVisualRef.value,
            iconColumnLive: iconColumnRef.value,
            staggerLive: staggerTargets(),
            hasFly: originOk && Boolean(cloneLive),
            cloneLive,
          });
        });
      }

      continueEnterAfterMeasure({
        backdropLive,
        targetVisualLive,
        iconColumnLive,
        staggerLive,
        hasFly: originOk && Boolean(cloneLive),
        cloneLive,
      });
    });
}

/**
 * @param {{
 *   backdropLive: HTMLElement,
 *   targetVisualLive: HTMLElement,
 *   iconColumnLive: HTMLElement | null,
 *   staggerLive: HTMLElement[],
 *   hasFly: boolean,
 *   cloneLive: HTMLElement | null,
 * }} ctx
 */
function continueEnterAfterMeasure(ctx) {
  const { backdropLive, targetVisualLive, iconColumnLive, staggerLive, hasFly, cloneLive } = ctx;

  if (!hasFly && targetVisualLive) {
    gsap.set(targetVisualLive, {
      visibility: "visible",
      scale: 0.94,
      transformOrigin: "50% 50%",
    });
  }

  /** @type {{ left: number, top: number, width: number, height: number } | null} */
  let flyTo = null;
  const flyFrom = validOrigin(props.originRect) ? props.originRect : null;

  if (hasFly && flyFrom) {
    void backdropLive.offsetHeight;
    flyTo = isDeckOffer.value ? resolveDeckOfferFlyTargetRect() : resolveDetailFlyFrameRect();
  }

  if (hasFly && flyFrom && flyTo && cloneLive) {
    gsap.killTweensOf(cloneLive);
    gsap.set(cloneLive, { clearProps: "transform" });
    gsap.set(cloneLive, {
      visibility: "visible",
      opacity: 1,
      left: flyFrom.left,
      top: flyFrom.top,
      width: flyFrom.width,
      height: flyFrom.height,
      margin: "0",
      pointerEvents: "none",
    });
    if (iconColumnLive) {
      gsap.set(iconColumnLive, { opacity: 1, pointerEvents: "auto", clearProps: "opacity,pointerEvents" });
    }
    bootMask.value = false;

    enterTl = gsap.timeline();

    enterTl.to(
      cloneLive,
      {
        left: flyTo.left,
        top: flyTo.top,
        width: flyTo.width,
        height: flyTo.height,
        duration: 0.36,
        ease: EASE_TRANSFORM,
      },
      0,
    );

    if (props.previewNavTotal > 1) {
      previewNavRef.value?.appendEnterAnimation?.(enterTl, 0.3);
    }

    enterTl.add(() => {
      gsap.set(targetVisualLive, {
        opacity: 1,
        visibility: "visible",
        pointerEvents: "auto",
        clearProps: "opacity,visibility,pointerEvents",
      });
      const node = flyCloneRef.value;
      if (node) gsap.set(node, { opacity: 0, visibility: "hidden" });
      requestAnimationFrame(() => {
        flyCloneActive.value = false;
        if (node?.isConnected) gsap.set(node, { clearProps: "transform" });
      });
    });

    enterTl.to(
      staggerLive,
      {
        opacity: 1,
        y: 0,
        duration: 0.18,
        stagger: 0.038,
        ease: EASE_TRANSFORM,
        clearProps: "opacity,transform",
      },
      0.12,
    );
    enterTl.eventCallback("onComplete", () => {
      initialEnterDone.value = true;
    });
    return;
  }

  flyCloneActive.value = false;
  if (iconColumnLive) {
    gsap.set(iconColumnLive, { opacity: 1, pointerEvents: "auto", clearProps: "opacity,pointerEvents" });
  }
  bootMask.value = false;

  if (hasFly && flyFrom && !flyTo) {
    gsap.set(targetVisualLive, {
      visibility: "visible",
      opacity: 0,
      scale: 0.94,
      transformOrigin: "50% 50%",
      pointerEvents: "none",
    });
  }

  enterTl = gsap.timeline();

  enterTl.to(
    targetVisualLive,
    {
      opacity: 1,
      visibility: "visible",
      scale: 1,
      pointerEvents: "auto",
      duration: 0.22,
      ease: EASE_TRANSFORM,
      clearProps: "opacity,visibility,scale,pointerEvents",
    },
    0.06,
  );
  if (props.previewNavTotal > 1) {
    previewNavRef.value?.appendEnterAnimation?.(enterTl, 0.08);
  }

  enterTl.to(
    staggerLive,
    {
      opacity: 1,
      y: 0,
      duration: 0.18,
      stagger: 0.038,
      ease: EASE_TRANSFORM,
      clearProps: "opacity,transform",
    },
    0.05,
  );
  enterTl.eventCallback("onComplete", () => {
    initialEnterDone.value = true;
  });
}

function runContentEnterAnimation() {
  const backdrop = backdropRef.value;
  const targetVisual = targetVisualRef.value;
  if (!backdrop || !targetVisual) return;

  flyCloneActive.value = false;

  if (shouldSkipDecorativeMotion()) {
    if (enterTl) {
      enterTl.kill();
      enterTl = null;
    }
    instantRevealGsapTargets(staggerTargets());
    instantRevealGsapTargets([targetVisual]);
    if (iconColumnRef.value) {
      instantRevealGsapTargets([iconColumnRef.value], {
        opacity: 1,
        pointerEvents: "auto",
        visibility: "visible",
      });
    }
    return;
  }

  if (enterTl) {
    enterTl.kill();
    enterTl = null;
  }

  const staggerEls = staggerTargets();
  const iconColumn = iconColumnRef.value;
  gsap.killTweensOf([targetVisual, iconColumn, ...staggerEls].filter(Boolean));
  applyEnterInitialHide(backdrop, staggerEls, targetVisual, false);
  if (iconColumn) {
    gsap.set(iconColumn, { opacity: 1, pointerEvents: "auto", clearProps: "opacity,pointerEvents" });
  }
  gsap.set(targetVisual, {
    visibility: "visible",
    scale: 0.94,
    transformOrigin: "50% 50%",
  });

  enterTl = gsap.timeline();
  enterTl.to(
    targetVisual,
    {
      opacity: 1,
      visibility: "visible",
      scale: 1,
      duration: 0.22,
      ease: EASE_TRANSFORM,
      clearProps: "opacity,visibility,scale,pointerEvents",
    },
    0,
  );
  enterTl.to(
    staggerEls,
    {
      opacity: 1,
      y: 0,
      duration: 0.18,
      stagger: 0.038,
      ease: EASE_TRANSFORM,
      clearProps: "opacity,transform",
    },
    0.05,
  );
}

function onPreviewNavStep(delta) {
  if (props.previewNavTotal <= 1) return;
  emit("preview-nav", delta);
}

function dismissFlyClone() {
  const clone = flyCloneRef.value;
  if (clone) gsap.killTweensOf(clone);
  flyCloneActive.value = false;
}

function runCloseAnimation(shouldEmit, options = {}) {
  scheduleOverlayDismiss(240);
  const deckFlyParallelClose = options.deckFlyParallelClose === true;
  if (closeFlightPromise) {
    return closeFlightPromise;
  }
  closing.value = true;
  bootMask.value = false;
  const backdrop = backdropRef.value;
  const targetVisual = targetVisualRef.value;
  const clone = flyCloneRef.value;
  const staggerEls = staggerTargets();

  if (enterTl) {
    enterTl.kill();
    enterTl = null;
  }

  dismissFlyClone();

  gsap.killTweensOf([
    backdrop,
    targetVisual,
    clone,
    ...staggerEls,
    ...(previewNavRef.value?.getAnimTargets?.() ?? []),
  ].filter(Boolean));

  closeFlightPromise = new Promise((resolve) => {
    const finishClose = () => {
      closing.value = false;
      closeFlightPromise = null;
      if (shouldEmit) {
        emit("close");
      }
      resolve(undefined);
    };

    if (shouldSkipDecorativeMotion()) {
      previewNavRef.value?.instantCloseHide?.();
      instantPortalLayerClose({ backdrop, staggerEls, primaryEl: targetVisual }).then(finishClose);
      return;
    }

    const tl = gsap.timeline({
      onComplete: finishClose,
    });

    previewNavRef.value?.appendCloseAnimation?.(tl, 0);

    if (backdrop) {
      tl.to(
        backdrop,
        {
          ...portalScrimGsapVars("rgba(14, 12, 10, 0)"),
          duration: 0.2,
          ease: EASE_TRANSFORM,
        },
        0,
      );
    }

    const rev = [...staggerEls].reverse();
    if (rev.length) {
      tl.to(
        rev,
        {
          opacity: 0,
          y: 5,
          duration: 0.11,
          stagger: 0.028,
          ease: EASE_TRANSFORM,
        },
        0,
      );
    }

    if (targetVisual && deckFlyParallelClose) {
      tl.to(
        targetVisual,
        {
          opacity: 0,
          duration: 0.16,
          ease: EASE_TRANSFORM,
        },
        0,
      );
    } else if (targetVisual) {
      tl.to(
        targetVisual,
        {
          opacity: 0,
          scale: 0.94,
          duration: 0.16,
          ease: EASE_TRANSFORM,
          transformOrigin: "50% 50%",
        },
        0.02,
      );
    }
  });

  return closeFlightPromise;
}

function requestClose() {
  if (closeFlightPromise) return;
  void runCloseAnimation(true);
}

/** @param {{ deckFlyParallelClose?: boolean }} [options] */
function playClose(options = {}) {
  return runCloseAnimation(false, options);
}

function consumeDeckOfferTileVisual() {
  const tile = refToFlyFrameEl(detailFlyFrameRef.value);
  if (tile) {
    gsap.set(tile, {
      opacity: 0,
      visibility: "hidden",
      pointerEvents: "none",
      height: 0,
      minHeight: 0,
      margin: 0,
      padding: 0,
      overflow: "hidden",
      aspectRatio: "auto",
    });
  }
  const stack = refToFlyFrameEl(deckOfferStackRef.value);
  const price = stack?.querySelector?.(".shop-treasure-price");
  if (price instanceof HTMLElement) {
    gsap.set(price, { opacity: 0, visibility: "hidden", pointerEvents: "none" });
  }
}

/** 包内字母加入牌库：tile 已从预览移除，与飞行动画同时执行其余离场 */
function beginDeckFlyParallelClose() {
  previewNavRef.value?.instantEnterHide?.();
  consumeDeckOfferTileVisual();
  const targetVisual = targetVisualRef.value;
  if (targetVisual) {
    gsap.set(targetVisual, { pointerEvents: "none" });
  }
}

function onDocumentKeydown(e) {
  if (props.previewNavTotal > 1 && e.key === "ArrowLeft") {
    e.preventDefault();
    onPreviewNavStep(-1);
    return;
  }
  if (props.previewNavTotal > 1 && e.key === "ArrowRight") {
    e.preventDefault();
    onPreviewNavStep(1);
    return;
  }
  if (e.key === "Escape") {
    e.preventDefault();
    requestClose();
  }
}

watch(
  () => props.treasure,
  () => {
    armBackdropSelfCloseGuard();
    stackZ.value = bumpOverlayZ();
  },
  { deep: true, immediate: true },
);

onMounted(() => {
  armBackdropSelfCloseGuard();
  document.addEventListener("keydown", onDocumentKeydown);
  schedulePreviewLayerPresent(280);
  void nextTick(() => {
    const backdrop = backdropRef.value;
    const targetVisual = targetVisualRef.value;
    if (backdrop && targetVisual) {
      applyEnterInitialHide(backdrop, staggerTargets(), targetVisual);
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => runEnterAnimation());
    });
  });
});

watch(
  () => props.overlaySuppressed,
  (suppressed, was) => {
    if (was && !suppressed) {
      bootMask.value = true;
      void nextTick(() => {
        requestAnimationFrame(() => runEnterAnimation());
      });
    }
  },
);

watch(
  () => props.previewNavIndex,
  (next, prev) => {
    if (prev == null || next === prev || !initialEnterDone.value) return;
    if (props.previewNavTotal <= 1) return;
    triggerHaptic("tabSwitch");
    void nextTick(() => {
      requestAnimationFrame(() => runContentEnterAnimation());
    });
  },
);

onUnmounted(() => {
  document.removeEventListener("keydown", onDocumentKeydown);
  if (enterTl) {
    enterTl.kill();
    enterTl = null;
  }
  closeFlightPromise = null;
});

defineExpose({
  getEmojiEl: () => emojiRef.value,
  /** 购买飞入槽位 / 牌库：字母块为 tile + 价签整列 */
  getFlyFrameEl: () =>
    isDeckOffer.value
      ? refToFlyFrameEl(deckOfferStackRef.value)
      : refToFlyFrameEl(detailFlyFrameRef.value),
  /** 预览区 `.shop-treasure-visual`（星星法术失败反馈等） */
  getTargetVisualEl: () => targetVisualRef.value,
  getWalletEl: () => walletBoxRef.value,
  playClose,
  beginDeckFlyParallelClose,
});
</script>
