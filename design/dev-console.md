# 开发控制台（浏览器 DevTools）

仅在 **Vite 开发模式**（`npm run dev`）下可用；正式构建不会挂载 `__WM_DEV__`。

## 打开方式

1. 启动本地开发服务器：`npm run dev`
2. 浏览器打开游戏页面，按 `F12` 打开开发者工具，切到 **Console**
3. 输入下方命令并回车

## 命令

### 全收藏解锁

```js
__WM_DEV__.unlockFullCollection()
```

对**当前选中的存档槽位**写入：

- 全部宝藏 / 法术 / 升级 / 优惠券（含 2 级）/ 材质 / 配饰图鉴
- 全部成就

指定槽位（0、1、2）：

```js
__WM_DEV__.unlockFullCollection(0)
```

执行后会打印进度摘要，例如 `100% (120/120)`。若收藏页已打开，关闭后重新进入即可刷新。

### 帮助

```js
__WM_DEV__.help()
```

## 实现位置

| 文件 | 说明 |
|------|------|
| `src/dev/registerDevConsole.js` | 挂载 `globalThis.__WM_DEV__` |
| `src/dev/unlockFullCollection.js` | 写入生涯 `career` 字段的逻辑 |
| `src/App.vue` | `onMounted` 时注册，`onBeforeUnmount` 时卸载 |

## 相关自动化桥接

E2E 自动化使用独立全局对象（需 URL `?e2e=1`）：

- `__WM_APP_E2E__` — 主菜单 / 开局
- `__WM_E2E__` — 局内自动游玩

与 `__WM_DEV__` 无关。
