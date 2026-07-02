<script setup>
import { computed, inject, provide, reactive, ref } from "vue";
import { RUN_SESSION_KEY } from "../../runSession/useRunSession.js";
import { sessionUnref as sv, sessionReactive } from "../../runSession/sessionUnref.js";
import { OVERLAY_VIEW_KEY } from "./overlayViewKey.js";
import TreasureDetailLayer from "../TreasureDetailLayer.vue";
import PackPickLayer from "../PackPickLayer.vue";
import SpellTargetLayer from "../SpellTargetLayer.vue";
import TileDetailLayer from "../TileDetailLayer.vue";
import TreasureCollectionLayer from "../TreasureCollectionLayer.vue";
import PauseOptionsLayer from "../PauseOptionsLayer.vue";
import InfoModal from "../InfoModal.vue";
import SettingsHelpDialog from "../settings/SettingsHelpDialog.vue";
import DeckPreviewLayer from "./DeckPreviewLayer.vue";
import BossBlindRerollLayer from "../BossBlindRerollLayer.vue";
import PagerQuizLayer from "../PagerQuizLayer.vue";
import DeveloperOptionsLayer from "../DeveloperOptionsLayer.vue";
import RunGlobalOverlays from "./RunGlobalOverlays.vue";

/** @type {import('../../runSession/runSessionTypes.js').RunSession} */
const session = inject(RUN_SESSION_KEY);
if (!session?.treasures || !session.spell || !session.packPick || !session.shop || !session.lifecycle) {
  throw new Error("RunOverlayHost: incomplete RunSession");
}
if (!session.overlayStack?.buildViewContext) {
  throw new Error("RunOverlayHost: overlayStack.buildViewContext missing");
}
/** @type {import('./overlayViewKey.js').OverlayViewContext} */
const ov = session.overlayStack.buildViewContext();
provide(OVERLAY_VIEW_KEY, ov);

const treasures = sessionReactive(session.treasures);
const spell = session.spell;
const packPick = session.packPick;
const shop = session.shop;
const run = sessionReactive(session.run);
const phase = session.phase;
const overlayStack = session.overlayStack;
const lifecycle = session.lifecycle;
const pauseOverlay = session.pauseOverlay;
if (!pauseOverlay) {
  throw new Error("RunOverlayHost: session.pauseOverlay missing");
}

const developerOptionsOpen = computed(() => pauseOverlay.showDeveloperOptions.value);
const developerOptionsStyle = computed(() => pauseOverlay.developerOptionsPortalStackStyle.value);
const developerOptionsItems = computed(() => pauseOverlay.developerTreasureItems.value);
const developerSpellItems = computed(() => pauseOverlay.developerSpellItems.value);
const developerCurrentBalance = computed(() => pauseOverlay.developerCurrentBalance.value);

const developerOptionsLayerRef = pauseOverlay.developerOptionsLayerRef;

const treasureDetailLayerRef = ref(null);
const packPickLayerRef = ref(null);
const spellTargetLayerRef = ref(null);
const tileDetailLayerRef = ref(null);
const bossBlindRerollLayerRef = ref(null);

const shopOverlayLayersSuppressed = computed(() => sv(phase.shopOverlayLayersSuppressed));

const pausePortalStyle = computed(() => sv(overlayStack.pauseOptionsPortalStackStyle));

const activeTreasureDetail = computed(() => {
  const detail = sv(treasures.treasureDetail);
  return detail?.treasure ? detail : null;
});
const treasureDetailDescriptionOverride = computed(() => sv(treasures.treasureDetailDescriptionOverride));
const treasureDetailChargeVisualState = computed(() => sv(treasures.treasureDetailChargeVisualState));
const treasureDetailChargeProgress = computed(() => sv(treasures.treasureDetailChargeProgress));
const treasureDetailEffectDepleted = computed(() => sv(treasures.treasureDetailEffectDepleted));
const treasureDetailMode = computed(() => sv(treasures.treasureDetailMode));
const treasureSellRefund = computed(() => sv(treasures.treasureSellRefund));
const treasureProbabilityDoublerCount = computed(() => sv(treasures.treasureProbabilityDoublerCount));
const treasureDetailPreviewNavIndex = computed(() => sv(treasures.treasureDetailPreviewNavIndex));
const treasureDetailPreviewNavTotal = computed(() => sv(treasures.treasureDetailPreviewNavTotal));

const packPickSessionActive = computed(() => sv(packPick.packPickSession));
const packPickOverlaySuppressedActive = computed(() => sv(packPick.packPickOverlaySuppressed));
const packPickBusyActive = computed(() => sv(packPick.packPickBusy));
const packPickSkipBusyActive = computed(() => sv(packPick.packPickSkipBusy));

const spellTargetSessionActive = computed(() => sv(spell.spellTargetSession));
const spellReplayTargetSpellId = computed(() => {
  const fromOwned = sv(treasures.treasureDetailSpellReplayTargetId);
  if (fromOwned) return fromOwned;
  const detail = sv(treasures.treasureDetail);
  if (detail?.treasure?.offerType === "spell" && String(detail.treasure.spellId ?? "") === "restart") {
    return sv(spell.lastReplayableSpellId);
  }
  return null;
});

const bossRerollSessionActive = computed(() => sv(lifecycle.bossRerollSession));
const pagerQuizSessionActive = computed(() => sv(lifecycle.pagerQuizSession));

const runOwnedVoucherIds = computed(() => sv(run.ownedVoucherIds));
const runPresetId = computed(() => sv(run.runPresetId));
const runTreasureRunState = computed(() => sv(run.treasureRunState));
const runOwnedTreasures = computed(() => sv(run.ownedTreasures));
const runOwnedSlotTreasureIds = computed(() =>
  runOwnedTreasures.value.map((s) => s?.treasureId ?? null),
);
const runIsEndlessRun = computed(() => sv(run.isEndlessRun));
const runDifficultyIndex = computed(() => sv(run.runDifficultyIndex));

const shopRunWalletFloor = computed(() => sv(shop.runWalletFloor));

defineExpose({
  treasureDetailLayerRef,
  packPickLayerRef,
  spellTargetLayerRef,
  tileDetailLayerRef,
  bossBlindRerollLayerRef,
});
</script>


<template>
    <RunGlobalOverlays />
    <DeckPreviewLayer />
    <TreasureDetailLayer
      v-if="activeTreasureDetail"
      ref="treasureDetailLayerRef"
      :overlay-suppressed="shopOverlayLayersSuppressed"
      :treasure="activeTreasureDetail.treasure"
      :description-override="treasureDetailDescriptionOverride"
      :charge-visual-state="treasureDetailChargeVisualState"
      :charge-progress="treasureDetailChargeProgress"
      :effect-depleted="treasureDetailEffectDepleted"
      :mode="treasureDetailMode"
      :show-shelf-price="activeTreasureDetail.showShelfPrice"
      :wallet-amount="ov.walletHeaderShown"
      :sell-refund="treasureSellRefund"
      :can-buy-offer="ov.treasureCanBuyOffer"
      :pack-inner-already-claimed="ov.treasurePackInnerAlreadyClaimed"
      :origin-rect="activeTreasureDetail.originRect ?? null"
      :owned-voucher-ids="runOwnedVoucherIds"
      :run-preset-id="runPresetId"
      :shop-upgrades-free="runTreasureRunState.shopUpgradesFree"
      :wallet-floor="shopRunWalletFloor"
      :spell-replay-target-spell-id="spellReplayTargetSpellId"
      :rarity-levels-by-rarity="ov.rarityLevelsByRarity"
      :probability-doubler-count="treasureProbabilityDoublerCount"
      :spell-grant-flow="activeTreasureDetail.spellGrantFlow === true"
      :preview-nav-index="treasureDetailPreviewNavIndex"
      :preview-nav-total="treasureDetailPreviewNavTotal"
      :stack-z-floor="ov.firstWordTutorialTreasureDetailStackZFloor"
      :owned-slot-treasure-ids="runOwnedSlotTreasureIds"
      @close="ov.onTreasureDetailClose"
      @purchase="ov.onTreasurePurchase"
      @sell="ov.onTreasureSell"
      @open-spell-replay-target-preview="spell.onOpenSpellReplayTargetPreview"
      @preview-nav="treasures.onTreasurePreviewNav"
    />
    <TreasureDetailLayer
      v-if="ov.spellReferencePreview"
      :overlay-suppressed="shopOverlayLayersSuppressed"
      :treasure="ov.spellReferencePreview"
      mode="spell-reference"
      :owned-voucher-ids="runOwnedVoucherIds"
      :rarity-levels-by-rarity="ov.rarityLevelsByRarity"
      :probability-doubler-count="treasureProbabilityDoublerCount"
      :owned-slot-treasure-ids="runOwnedSlotTreasureIds"
      @close="ov.clearSpellReferencePreview()"
    />
    <PackPickLayer
      v-if="packPickSessionActive"
      ref="packPickLayerRef"
      :overlay-suppressed="shopOverlayLayersSuppressed || packPickOverlaySuppressedActive"
      :session="packPickSessionActive"
      :wallet-amount="ov.walletHeaderShown"
      :owned-voucher-ids="runOwnedVoucherIds"
      :run-preset-id="runPresetId"
      :wallet-floor="shopRunWalletFloor"
      :disabled="packPickBusyActive || packPickSkipBusyActive"
      @open-item="packPick.onPackPickOpenItem"
      @skip="packPick.onPackPickSkip"
    />
    <TreasureCollectionLayer
      :open="ov.showTreasureCollectionLayer"
      :owned-treasures="runOwnedTreasures"
      :key-order-bag="treasures.gameOwnedKeyOrderBag"
      :amber-boss-mask="ov.isAmberBossMaskActive"
      :gem-class-resolver="ov.gameTreasureGemClassResolver"
      :charge-states="treasures.treasureChargeVisualBySlot"
      :charge-progresses="treasures.treasureChargeProgressBySlot"
      :effect-depleted-states="treasures.treasureEffectDepletedBySlot"
      :slot-class-resolver="ov.gameTreasureSlotClassResolver"
      :crimson-hand-disabled-resolver="ov.gameTreasureCrimsonDisabledResolver"
      :drag-gem-class="ov.treasureGemClass(treasures.gameOwnedDragTreasure?.rarity)"
      :drag-charge-state="treasures.gameOwnedDragChargeState"
      :drag-charge-progress="treasures.gameOwnedDragChargeProgress"
      :drag-effect-depleted="treasures.gameOwnedDragEffectDepleted"
      :on-reorder-commit="treasures.onTreasureCollectionReorder"
      @close="ov.closeTreasureCollectionLayer()"
      @slot-click="ov.onGameOwnedSlotClick"
      @empty-slot-click="ov.onGameEmptyTreasureSlotClick"
    />
    <SettingsHelpDialog
      :open="ov.showEmptyTreasureSlotHelp"
      title="空的宝藏栏位"
      :paragraphs="['你获得的宝藏会放置在这里']"
      @close="ov.closeEmptyTreasureSlotHelp()"
    />
    <SpellTargetLayer
      v-if="spellTargetSessionActive"
      ref="spellTargetLayerRef"
      :overlay-suppressed="shopOverlayLayersSuppressed"
      :session="spellTargetSessionActive"
      :probability-doubler-count="treasureProbabilityDoublerCount"
      @confirm="spell.onSpellTargetConfirm"
      @cancel="spell.onSpellTargetCancel"
    />
    <TileDetailLayer
      v-if="ov.tileDetailPayload"
      ref="tileDetailLayerRef"
      :overlay-suppressed="shopOverlayLayersSuppressed"
      :payload="ov.tileDetailPayload"
      :origin-rect="ov.tileDetailOriginRect"
      :rarity-levels-by-rarity="ov.rarityLevelsByRarity"
      :preview-nav-index="ov.tileDetailPreviewNavIndex"
      :preview-nav-total="ov.tileDetailPreviewNavTotal"
      @close="ov.closeTileDetail"
      @preview-nav="ov.onTilePreviewNav"
    />
    <BossBlindRerollLayer
      v-if="bossRerollSessionActive"
      ref="bossBlindRerollLayerRef"
      :session="bossRerollSessionActive"
      :wallet-amount="ov.walletHeaderShown"
      :wallet-floor="shopRunWalletFloor"
      :owned-voucher-ids="runOwnedVoucherIds"
      :spell-counts-by-length="ov.spellCountsByLength"
      :overlay-suppressed="shopOverlayLayersSuppressed"
      @reroll="lifecycle.onBossBlindRerollPaid()"
      @continue="lifecycle.onBossBlindRerollContinue($event)"
    />
    <PagerQuizLayer
      v-if="pagerQuizSessionActive"
      :session="pagerQuizSessionActive"
      :overlay-suppressed="shopOverlayLayersSuppressed"
      @resolved="lifecycle.onPagerQuizResolved($event)"
      @closed="lifecycle.onPagerQuizClosed()"
    />
    <Teleport defer to="#game-view-portal-frame">
      <DeveloperOptionsLayer
        ref="developerOptionsLayerRef"
        :open="developerOptionsOpen"
        :portal-stack-style="developerOptionsStyle"
        :current-balance="developerCurrentBalance"
        :treasure-items="developerOptionsItems"
        :spell-items="developerSpellItems"
        @close="pauseOverlay.onDeveloperOptionsClose()"
        @convert-deck="pauseOverlay.onDeveloperConvertDeck($event)"
        @jump-level="pauseOverlay.onDeveloperJumpLevel($event)"
        @jump-boss-shop="pauseOverlay.onDeveloperJumpBossShop($event)"
        @grant-treasures="pauseOverlay.onDeveloperGrantTreasures($event)"
        @cast-spell="pauseOverlay.onDeveloperCastSpell($event)"
        @set-balance="pauseOverlay.onDeveloperSetBalance($event)"
      />
    </Teleport>
    <Teleport defer to="#game-view-portal-frame">
      <PauseOptionsLayer
        :open="ov.showPauseOptions"
        :show-end-game="runIsEndlessRun"
        :portal-stack-style="pausePortalStyle"
        @end-game="pauseOverlay.onPauseEndGame()"
        @continue="ov.onPauseContinue"
        @new-run="ov.onPauseNewRun"
        @settings="ov.onPauseSettings"
        @developer-options="ov.onPauseDeveloperOptions"
        @main-menu="ov.onPauseMainMenu"
      />
    </Teleport>
    <Teleport defer to="#game-view-portal-frame">
      <Transition name="info-layer" :css="true">
      <InfoModal
        v-if="ov.showInfoLayer"
        :overlay-suppressed="shopOverlayLayersSuppressed"
        v-model="ov.showInfoLayer"
        :initial-tab="ov.infoModalInitialTab"
        :spell-counts="ov.spellCountsByLength"
        :length-levels="ov.lengthLevelsByLength"
        :length-upgrade-observatory-extra="ov.lengthUpgradeObservatoryExtra"
        :rarity-levels="ov.rarityLevelsByRarity"
        :owned-voucher-ids="runOwnedVoucherIds"
        :run-seed-display="ov.runSeedDisplay"
        :current-level-id="ov.currentLevel?.id ?? ''"
        :in-shop="ov.showShop"
        :next-level-id="ov.infoModalNextLevelId"
        :run-seed-numeric="ov.getRunSeedNumeric()"
        :active-boss-slug="ov.activeBossSlug"
        :is-endless-run="runIsEndlessRun"
        :run-preset-id="runPresetId"
        :run-difficulty-index="runDifficultyIndex"
        @select-owned-voucher="ov.onInfoSelectOwnedVoucher"
      />
      </Transition>
    </Teleport>
</template>
