<script setup>
import "../../../css/game.deck-layer.css";
import { computed, inject, reactive } from "vue";
import { RUN_SESSION_KEY } from "../../runSession/useRunSession.js";
import { sessionReactive, sessionUnref as sv } from "../../runSession/sessionUnref.js";
import { DECK_PREVIEW_KEY } from "./deckPreviewKey.js";
import LetterTile from "../LetterTile.vue";

/** @type {import('../../runSession/runSessionTypes.js').RunSession} */
const session = inject(RUN_SESSION_KEY);
/** @type {ReturnType<import('../../composables/useDeckPreviewLayer.js').useDeckPreviewLayer>} */
const deckPreview = inject(DECK_PREVIEW_KEY);
if (!session?.overlayStack || !session.phase || !deckPreview) {
  throw new Error("DeckPreviewLayer: RUN_SESSION_KEY, phase, or DECK_PREVIEW_KEY missing");
}

/** provide plain object 时，嵌套 ref/computed 在 template 中不会自动解包 */
const deck = reactive(deckPreview);

const overlayStack = session.overlayStack;
const phase = sessionReactive(session.phase);
const deckPortalStyle = computed(() => sv(overlayStack.deckPortalStackStyle));
</script>

<template>
  <Teleport defer to="#game-view-portal-frame">
    <Transition name="deck-layer">
      <div
        v-show="deck.showDeckLayer"
        class="deck-layer portal-overlay-fill"
        :class="{
          'portal-overlay--shop-upgrade-suppressed': phase.shopOverlayLayersSuppressed,
          'deck-layer--stack-expanded': deck.deckStackExpandRaw != null,
        }"
        :style="deckPortalStyle"
        @click.self="deck.onDeckLayerBackdropClick"
      >
        <div
          :ref="deck.setDeckLayerInnerRef"
          class="deck-layer-inner"
          :class="{
            'deck-layer-inner--enter-boot': deck.deckLayerEnterBoot,
            'deck-layer-inner--stack-expanded': deck.deckStackExpandRaw != null,
          }"
        >
          <div class="deck-layer-title deck-layer-enter-stagger">
            <span class="deck-layer-title-main">字母库</span>
            <span class="deck-layer-title-count"> ({{ deck.deckLayerRemainingCount }}/{{ deck.deckLayerTotalCount }})</span>
          </div>
          <div
            :ref="deck.setDeckLayerScrollOuterRef"
            class="deck-layer-grid-scroll-outer"
            :style="deck.deckLayerScrollChromeStyle"
          >
            <div
              :ref="deck.setDeckLayerScrollBodyRef"
              class="deck-layer-grid-area"
              :class="{ 'deck-layer-grid-area--scrollable': deck.deckLayerGridNeedsScroll }"
              @scroll.passive="deck.onDeckLayerGridScroll"
            >
              <div :ref="deck.setDeckLayerGridContentRef" class="deck-layer-grid-slot">
                <div class="deck-layer-stacks">
                  <button
                    v-for="stack in deck.deckStacksView"
                    :key="stack.raw"
                    type="button"
                    class="deck-stack deck-layer-enter-stagger"
                    :class="{ 'deck-stack--ghost': stack.isGhost }"
                    :disabled="stack.isGhost"
                    :aria-label="stack.isGhost ? `${stack.displayLetter} 无牌` : `${stack.displayLetter}，共 ${stack.count} 张`"
                    @click="deck.openDeckStackDetail(stack, $event)"
                  >
                    <span class="deck-stack-count" aria-hidden="true">{{ stack.count }}</span>
                    <div v-if="!stack.isGhost" class="deck-stack-pile" aria-hidden="true">
                      <div
                        v-for="(entry, idx) in deck.deckStackPileVisibleEntries(stack)"
                        :key="deck.deckEntryKey(entry, idx)"
                        class="deck-stack-pile-cell"
                        :class="{ 'deck-stack-pile-cell--dimmed': entry.dimmed }"
                        :style="deck.deckStackPileCellStyle(stack, idx)"
                      >
                        <LetterTile
                          v-if="deck.deckEntryTileProps(entry)"
                          variant="grid"
                          class="deck-stack-pile-tile"
                          :material-animate="deck.deckStackMaterialAnimate(stack)"
                          v-bind="deck.deckEntryTileProps(entry)"
                        />
                      </div>
                    </div>
                    <div v-else class="deck-stack-ghost-face" aria-hidden="true">
                      <span class="deck-stack-ghost-char">{{ stack.displayLetter }}</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
            <div
              v-show="deck.deckLayerGridNeedsScroll"
              :ref="deck.setDeckLayerScrollTrackRef"
              class="deck-layer-scroll-track"
              aria-hidden="true"
              @pointerdown="deck.onDeckLayerTrackPointerDown"
            >
              <div
                class="deck-layer-scroll-thumb"
                :class="{ 'deck-layer-scroll-thumb--dragging': deck.deckLayerThumbDragging }"
                :style="deck.deckLayerThumbStyle"
                @pointerdown.stop="deck.onDeckLayerThumbPointerDown"
              >
                <div class="deck-layer-scroll-thumb-grip" aria-hidden="true">
                  <span />
                  <span />
                </div>
              </div>
            </div>
          </div>
          <Transition name="deck-stack-expand">
            <div
              v-if="deck.deckStackExpandRaw != null && deck.deckExpandedStack"
              class="deck-stack-expand-layer"
              role="dialog"
              aria-modal="true"
              aria-labelledby="deck-stack-expand-heading"
            >
              <div id="deck-stack-expand-heading" class="deck-layer-title deck-layer-enter-stagger">
                <span class="deck-layer-title-main">「{{ deck.deckExpandedStack.displayLetter }}」</span>
                <span class="deck-layer-title-count"> {{ deck.deckExpandedStack.count }} 张</span>
              </div>
              <div
                :ref="deck.setDeckLayerExpandScrollOuterRef"
                class="deck-layer-grid-scroll-outer"
                :style="deck.deckLayerScrollChromeStyle"
              >
                <div
                  :ref="deck.setDeckLayerExpandScrollBodyRef"
                  class="deck-layer-grid-area"
                  :class="{ 'deck-layer-grid-area--scrollable': deck.deckExpandGridNeedsScroll }"
                  @scroll.passive="deck.onDeckExpandGridScroll"
                  @click.stop
                >
                  <div :ref="deck.setDeckLayerExpandGridContentRef" class="deck-layer-grid-slot">
                    <div class="deck-stack-expand-tiles">
                      <template v-for="(entry, idx) in deck.deckExpandedStack.entries" :key="deck.deckEntryKey(entry, idx)">
                        <div
                          v-if="deck.deckEntryTileProps(entry)"
                          class="deck-expand-tile-hit"
                          :class="{ 'deck-expand-tile-hit--dimmed': entry.dimmed }"
                          @click.stop="deck.onDeckExpandedTileClick(entry, $event)"
                          @contextmenu.prevent.stop="deck.onDeckExpandedTileContextMenu($event, entry)"
                          @pointerdown="deck.onDeckExpandedTileDetailPointerDown($event, entry)"
                        >
                          <LetterTile
                            variant="grid"
                            class="deck-expand-face-tile"
                            :material-animate="deck.deckExpandedStackMaterialAnimate"
                            v-bind="deck.deckEntryTileProps(entry)"
                          />
                        </div>
                      </template>
                    </div>
                  </div>
                </div>
                <div
                  v-show="deck.deckExpandGridNeedsScroll"
                  :ref="deck.setDeckLayerExpandScrollTrackRef"
                  class="deck-layer-scroll-track"
                  aria-hidden="true"
                  @pointerdown="deck.onDeckExpandTrackPointerDown"
                >
                  <div
                    class="deck-layer-scroll-thumb"
                    :class="{ 'deck-layer-scroll-thumb--dragging': deck.deckExpandThumbDragging }"
                    :style="deck.deckExpandThumbStyle"
                    @pointerdown.stop="deck.onDeckExpandThumbPointerDown"
                  />
                </div>
              </div>
            </div>
          </Transition>
          <button
            v-if="deck.deckStackExpandRaw != null"
            type="button"
            class="shop-btn shop-btn--next deck-layer-confirm deck-layer-enter-stagger"
            @click="deck.closeDeckStackDetail"
          >
            返回
          </button>
          <button
            v-else
            type="button"
            class="shop-btn shop-btn--buy deck-layer-confirm deck-layer-enter-stagger"
            @click="deck.closeDeckLayer()"
          >
            确定
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
