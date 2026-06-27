import { ref } from "vue";
import { coerceRunSeedNumeric, createRunRng } from "../game/runRng.js";
import { normalizeRunPresetId } from "../game/runPresetDefinitions.js";
import { normalizeRunDifficultyIndex } from "../game/runDifficultyDefinitions.js";
import { RUN_START_LEVEL_INDEX } from "../levelDefinitions.js";
import { createTreasureRunState } from "../treasures/treasureRunState.js";
import { createRunMatchStats } from "../game/runMatchStats.js";
import { createAchievementRunState } from "../achievements/achievementRunState.js";

/** @typedef {import('./runSessionTypes.js').RunSessionProps} RunSessionProps */
/** @typedef {import('./runSessionTypes.js').RunStore} RunStore */

/**
 * 局内 run 级 ref（任务 1.3）。
 * @param {RunSessionProps} props
 * @returns {RunStore & { runSeedNumeric: number; runRng: import('vue').Ref<ReturnType<typeof createRunRng>>; rng: () => number }}
 */
export function createRunStore(props) {
  const runPresetId = ref(
    normalizeRunPresetId(props.restoredSave?.runPresetId ?? props.runPresetId),
  );
  const runDifficultyIndex = ref(
    normalizeRunDifficultyIndex(
      props.restoredSave?.runDifficultyIndex ?? props.runDifficultyIndex,
    ),
  );
  const ownedVoucherIds = ref(/** @type {string[]} */ ([]));
  const runSeedNumeric = coerceRunSeedNumeric(
    props.restoredSave?.runSeedNumeric ?? props.runSeed,
  );
  const runRng = ref(createRunRng(runSeedNumeric, props.restoredSave?.rngState));

  /** @returns {number} */
  function rng() {
    return runRng.value.next();
  }

  const ownedTreasures = ref([null, null, null, null, null]);
  const levelIndex = ref(RUN_START_LEVEL_INDEX);
  const isEndlessRun = ref(false);
  const money = ref(0);
  const ownedUpgrades = ref(/** @type {unknown[]} */ ([]));
  const achievementRunState = ref(createAchievementRunState());
  const runMatchStats = ref(createRunMatchStats());
  const treasureRunState = ref(createTreasureRunState());

  return {
    runPresetId,
    runDifficultyIndex,
    ownedVoucherIds,
    runSeedNumeric,
    runRng,
    rng,
    ownedTreasures,
    levelIndex,
    isEndlessRun,
    money,
    ownedUpgrades,
    achievementRunState,
    runMatchStats,
    treasureRunState,
  };
}
