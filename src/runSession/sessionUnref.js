import { unref, isRef, isReactive, reactive } from "vue";

/** session 命名空间内的 Ref/Computed 在嵌套对象上不会自动解包，读取当前值用此 helper。 */
export function sessionUnref(value) {
  return unref(value);
}

/** 将 session 命名空间包成 reactive，供模板读取嵌套 ref/computed。 */
export function sessionReactive(value) {
  if (!value || isReactive(value)) return value;
  return reactive(value);
}
