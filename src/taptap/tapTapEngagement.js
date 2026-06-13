import { Capacitor } from "@capacitor/core";
import { ensureTapTapSdkInitialized, TapTap } from "./tapTapPlugin.js";

/** TapTap 商店游戏 id（与 tapTapWebPromo 中 app 页一致） */
export const TAP_TAP_APP_ID = "861643";

/** 浏览器 / 原生降级时打开的评价页 */
export const TAP_TAP_REVIEW_WEB_URL = `https://www.taptap.cn/app/${TAP_TAP_APP_ID}/review?os=android`;

/** 论坛小组 id（URL `/group/{id}`） */
export const TAP_TAP_FORUM_GROUP_ID = "1261323";

/**
 * 反馈子版块 id（URL `/group-label/{id}`）。
 * 注意：SDK `openScene` 需要的是开发者中心「场景化入口」生成的入口 ID，不是此网页 id。
 */
export const TAP_TAP_FEEDBACK_GROUP_LABEL_ID = "3279780";

export const TAP_TAP_FEEDBACK_FORUM_URL = `https://www.taptap.cn/group/${TAP_TAP_FORUM_GROUP_ID}/group-label/${TAP_TAP_FEEDBACK_GROUP_LABEL_ID}`;

/**
 * 开发者中心 → 游戏服务 → 内嵌动态 → 场景化入口配置 → 落地页选「反馈」子版块后得到的入口 ID。
 * 配置后原生会优先 `openScene`；留空则打开 {@link TAP_TAP_FEEDBACK_FORUM_URL}。
 */
export const TAP_TAP_FEEDBACK_SCENE_ID = "taprl0861643001";

/**
 * @param {string} url
 */
function openExternalUrl(url) {
  window.open(url, "_blank", "noopener,noreferrer");
}

/** 调起 TapTap 评价（原生 Review SDK；Web 打开评价页） */
export async function openTapTapReview() {
  if (Capacitor.isNativePlatform()) {
    await ensureTapTapSdkInitialized();
    try {
      await TapTap.openReview();
      return;
    } catch {
      /* 降级到外链 */
    }
  }
  openExternalUrl(TAP_TAP_REVIEW_WEB_URL);
}

/** 打开论坛（原生 Moment 场景入口或外链；Web 打开反馈子版块页） */
export async function openTapTapFeedbackForum() {
  if (Capacitor.isNativePlatform()) {
    await ensureTapTapSdkInitialized();
    try {
      const sceneId = TAP_TAP_FEEDBACK_SCENE_ID.trim();
      if (sceneId) {
        await TapTap.openMomentScene({ sceneId });
      } else {
        await TapTap.openExternalUrl({ url: TAP_TAP_FEEDBACK_FORUM_URL });
      }
      return;
    } catch {
      /* 降级到外链 */
    }
  }
  openExternalUrl(TAP_TAP_FEEDBACK_FORUM_URL);
}
