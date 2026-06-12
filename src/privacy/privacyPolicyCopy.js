/** TapTap SDK 隐私政策（TapTap 开发者文档官方页） */
export const TAPTAP_SDK_PRIVACY_POLICY_URL =
  "https://developer.taptap.cn/docs/sdk/start/agreement/";

export const PRIVACY_CONTACT_EMAIL = "chutz@foxmail.com";

export const PRIVACY_POLICY_EFFECTIVE_DATE = "2026年6月12日";

/** @typedef {{ type: 'text' | 'link' | 'bold'; value: string; href?: string }} PrivacyPolicySegment */

/**
 * @typedef {{ kind: 'p'; segments: readonly PrivacyPolicySegment[] }} PrivacyPolicyParagraphBlock
 * @typedef {{ kind: 'h'; text: string }} PrivacyPolicyHeadingBlock
 * @typedef {{ kind: 'ol' | 'ul'; items: readonly (readonly PrivacyPolicySegment[])[]; plain?: boolean }} PrivacyPolicyListBlock
 * @typedef {{ kind: 'gap' }} PrivacyPolicyGapBlock
 * @typedef {PrivacyPolicyParagraphBlock | PrivacyPolicyHeadingBlock | PrivacyPolicyListBlock | PrivacyPolicyGapBlock} PrivacyPolicyBlock
 */

/** @param {readonly PrivacyPolicySegment[]} segments @returns {PrivacyPolicyParagraphBlock} */
function p(segments) {
  return { kind: "p", segments };
}

/** @param {string} text @returns {PrivacyPolicyHeadingBlock} */
function h(text) {
  return { kind: "h", text };
}

/** @param {readonly (readonly PrivacyPolicySegment[])[]} items @returns {PrivacyPolicyListBlock} */
function ol(...items) {
  return { kind: "ol", items };
}

/** 目录项：正文已含「一、二、…」，不再叠加 HTML 序号。 */
/** @param {readonly (readonly PrivacyPolicySegment[])[]} items @returns {PrivacyPolicyListBlock & { plain: true }} */
function toc(...items) {
  return { kind: "ol", items, plain: true };
}

/** @param {readonly (readonly PrivacyPolicySegment[])[]} items @returns {PrivacyPolicyListBlock} */
function ul(...items) {
  return { kind: "ul", items };
}

/** @returns {PrivacyPolicyGapBlock} */
function gap() {
  return { kind: "gap" };
}

/** @param {string} value @returns {PrivacyPolicySegment} */
function t(value) {
  return { type: "text", value };
}

/** @param {string} value @returns {PrivacyPolicySegment} */
function b(value) {
  return { type: "bold", value };
}

/** @param {string} value @param {string} href @returns {PrivacyPolicySegment} */
function link(value, href) {
  return { type: "link", value, href };
}

/** @type {readonly PrivacyPolicyBlock[]} */
export const PRIVACY_POLICY_BODY_BLOCKS = [
  p([
    t("时移游戏（以下简称「我们」）系移动应用程序「单词大师」的运营者。我们非常重视保护用户（以下简称「您」）的个人信息和隐私。"),
  ]),
  p([
    t("您在使用单词大师时，游戏进度与设置主要保存在您的设备本地。为实现 TapTap 登录、防沉迷与成就同步等功能，在您同意本隐私政策后，我们及接入的第三方 SDK 会按本政策收集必要的设备标识与账号相关信息。"),
  ]),
  p([t("我们在此提醒您：")]),
  p([
    t("在您使用单词大师前，请您务必认真阅读本隐私政策，充分理解各条款内容，包括但不限于免除或限制我们责任的条款。您知晓并确认，您点击「同意」按钮并使用单词大师，即表示您同意我们按照本隐私政策处理您的个人信息。"),
  ]),
  gap(),
  h("本隐私政策将帮助您了解以下内容："),
  toc(
    [t("一、我们如何收集和使用您的个人信息")],
    [t("二、我们如何保存您的个人信息")],
    [t("三、我们如何使用 Cookies")],
    [t("四、我们如何共享、转让、公开披露您的个人信息")],
    [t("五、第三方产品或服务如何获得您的个人信息")],
    [t("六、我们如何保护您的个人信息")],
    [t("七、您如何管理您的个人信息")],
    [t("八、我们如何处理未成年人的个人信息")],
    [t("九、本隐私政策如何更新")],
    [t("十、如何联系我们")],
  ),
  gap(),
  h("一、我们如何收集和使用您的个人信息"),
  h("（一）我们如何收集您的个人信息"),
  p([
    t("在您游玩单词大师过程中，我们及接入的 SDK 可能在必要范围内收集以下信息。我们不会在您同意本隐私政策之前收集相关信息。"),
  ]),
  ul(
    [
      b("OAID（开放匿名设备标识符）"),
      t("：用于设备识别、统计分析、防作弊及 TapTap SDK 正常运行；"),
      b("收集方式"),
      t("为通过系统或 SDK 读取设备 OAID；"),
      b("使用目的"),
      t("为保障应用与 SDK 安全稳定运行；"),
      b("收集范围"),
      t("仅 OAID 本身，不与其他个人信息强制关联。"),
    ],
    [
      b("Android ID"),
      t("：当您使用 TapTap 登录相关功能时，"),
      b("TapTap 登录 SDK"),
      t("会读取 Android ID，用于账号登录、安全校验与防沉迷实名认证；"),
      b("收集方式"),
      t("为 SDK 读取设备 Android ID；"),
      b("使用目的"),
      t("完成 TapTap 账号登录与合规认证；"),
      b("收集范围"),
      t("仅在您主动使用 TapTap 登录、防沉迷或成就相关功能时收集。"),
    ],
    [
      b("本地游戏数据"),
      t("：游戏进度、设置、存档槽位等保存在您的设备本地，由您自行管理，我们不会上传至自有服务器。"),
    ],
  ),
  h("（二）设备权限调用情况"),
  p([
    t("在您使用单词大师过程中，我们需要在必要范围内向您申请获取设备权限。请您知悉，我们不会默认开启您设备的权限，仅在您主动确认开启的情况下，单词大师才有可能使用这些权限。如您在首次授权开启权限后希望关闭权限，您可以在设备的设置功能中选择关闭权限。"),
  ]),
  h("（三）我们如何使用您的个人信息"),
  p([
    t("我们仅将上述信息用于提供游戏基本功能、TapTap 登录与防沉迷、成就同步及保障服务安全稳定，不会用于本政策未说明的其他目的。"),
  ]),
  gap(),
  h("二、我们如何保存您的个人信息"),
  p([
    t("本地游戏数据保存在您的设备中。与 TapTap 登录、防沉迷相关的信息，由 TapTap SDK 按其隐私政策在必要期限内保存；详情请参阅"),
    link("TapTap SDK 隐私政策", TAPTAP_SDK_PRIVACY_POLICY_URL),
    t("。"),
  ]),
  gap(),
  h("三、我们如何使用 Cookies 和同类技术"),
  p([t("游戏没有使用 Cookies 和同类技术。")]),
  gap(),
  h("四、我们如何共享、转让、公开披露您的个人信息"),
  p([
    t("我们不会向第三方出售您的个人信息。除本政策及法律法规另有规定外，我们不会共享、转让或公开披露您的个人信息。"),
  ]),
  gap(),
  h("五、第三方产品或服务如何获得您的个人信息"),
  p([
    t("本游戏接入 TapTap SDK，包括 TapTap 登录 SDK、防沉迷 SDK、成就 SDK 等。上述 SDK 可能收集设备标识信息（如 OAID、Android ID）、网络状态、账号标识等，用于账号登录、防沉迷、成就同步等服务。"),
  ]),
  p([
    t("TapTap SDK 如何处理您的个人信息，请参阅"),
    link("TapTap SDK 隐私政策", TAPTAP_SDK_PRIVACY_POLICY_URL),
    t("。"),
  ]),
  gap(),
  h("六、我们如何保护您的个人信息"),
  p([
    t("我们采取合理可行的安全措施保护您的个人信息，防止未经授权的访问、披露、使用或丢失。请您妥善保管设备与账号信息。"),
  ]),
  gap(),
  h("七、您如何管理您的个人信息"),
  p([
    t("本地游戏数据可由您通过卸载应用或清除应用数据自行删除。与 TapTap 账号相关的信息，请通过 TapTap 客户端或 TapTap 官方渠道管理。"),
  ]),
  gap(),
  h("八、我们如何处理未成年人的个人信息"),
  p([
    t("我们非常重视对未成年人个人信息的保护。根据相关法律法规的规定，收集、使用未满 14 周岁的未成年人的个人信息，需由监护人授权同意；收集、使用已满 14 周岁未满 18 周岁的未成年人个人信息，可由监护人授权同意或自行授权同意。"),
  ]),
  p([
    t("如您为未成年人（尤其是不满 14 周岁的未成年人），我们要求您请您的父母或其他监护人仔细阅读本隐私政策，并在征得您的监护人授权同意的前提下使用我们的服务。"),
  ]),
  p([
    t("如您是未成年人的监护人，请您关注您所监护的未成年人是否是在您授权同意之后使用我们的产品或服务。"),
  ]),
  gap(),
  h("九、本隐私政策如何更新"),
  p([
    t("我们的隐私政策可能会适时发生变更。我们会在应用内发布对本隐私政策所做的任何变更。对于重大变更，我们还会提供更为显著的通知（我们可能会通过在浏览页面做特别提示等方式，说明隐私政策的具体变更内容）。未经您明确同意，我们不会削减您按照本隐私政策所应享有的权利。"),
  ]),
  gap(),
  h("十、如何联系我们"),
  p([
    t("如果您对本政策或个人信息保护有任何问题，您可以发送电子邮件至："),
    link(PRIVACY_CONTACT_EMAIL, `mailto:${PRIVACY_CONTACT_EMAIL}`),
  ]),
  p([t("一般情况下，我们将在十五个工作日内回复。")]),
];

/** 同意模式下追加在正文末尾的提示（view 模式不展示）。 */
/** @type {readonly PrivacyPolicyBlock[]} */
export const PRIVACY_POLICY_CONSENT_BLOCKS = [
  gap(),
  p([
    t("如您已阅读并同意以上《单词大师隐私政策》，且在使用 TapTap 相关功能时知悉"),
    link("TapTap SDK 隐私政策", TAPTAP_SDK_PRIVACY_POLICY_URL),
    t("，请点击「同意」开始使用本游戏。"),
  ]),
];
