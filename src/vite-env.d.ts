/// <reference types="vite/client" />

declare module "virtual:dev-recent-treasures" {
  /** 按 mtime 从新到旧排列的 treasureId（仅开发服务器有意义；生产为空数组） */
  export const DEV_RECENT_TREASURE_IDS: readonly string[];
}
