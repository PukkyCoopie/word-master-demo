/**
 * 启动最早补齐的内置 API（与 vite `build.target: chrome70` 对齐）。
 *
 * esbuild 会降级语法（??、?. 等），但不会改写 `Object.hasOwn`、`Array.prototype.at` 等
 * 运行时内置方法；缺啥补啥，避免业务代码逐个写 hasOwnProperty.call。
 */

/** @param {PropertyDescriptorMap | Record<string, (...args: unknown[]) => unknown>} builtins */
function defineBuiltins(prototype, builtins) {
  for (const [name, impl] of Object.entries(builtins)) {
    if (name in prototype) continue;
    const descriptor =
      typeof impl === "function"
        ? { value: impl, writable: true, configurable: true }
        : { configurable: true, writable: true, ...impl };
    Object.defineProperty(prototype, name, descriptor);
  }
}

/** 启动时调用一次；重复调用无副作用。 */
export function installLegacyPolyfills() {
  if (typeof Object.hasOwn !== "function") {
    Object.hasOwn = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);
  }

  if (typeof globalThis === "undefined") {
    const root =
      typeof self !== "undefined"
        ? self
        : typeof window !== "undefined"
          ? window
          : typeof global !== "undefined"
            ? global
            : {};
    Object.defineProperty(root, "globalThis", {
      value: root,
      configurable: true,
      enumerable: false,
      writable: true,
    });
  }

  defineBuiltins(Array.prototype, {
    at(index) {
      const len = this.length;
      const i = Number(index);
      if (!Number.isFinite(i)) return undefined;
      const k = i >= 0 ? i : len + i;
      return k < 0 || k >= len ? undefined : this[k];
    },
  });

  defineBuiltins(String.prototype, {
    replaceAll(search, replacement) {
      if (search instanceof RegExp) {
        if (!search.global) {
          throw new TypeError("String.prototype.replaceAll called with a non-global RegExp");
        }
        return this.replace(search, replacement);
      }
      const from = String(search);
      if (from === "") {
        return replacement === "" ? this : replacement + this.split("").join(replacement) + replacement;
      }
      return this.split(from).join(String(replacement));
    },
  });
}

installLegacyPolyfills();
