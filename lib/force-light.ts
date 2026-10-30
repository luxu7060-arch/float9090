"use client";

/**
 * 「外来 APP 强制浅色」总开关。
 *
 * 真正干活的是注入到自定义 APP iframe 里的守卫脚本（见
 * components/app-market/custom-app-runner.tsx 的 ai-phone-light-guard）。
 * 守卫启动时读这个 localStorage 键：
 *   'off'  → 整段守卫直接 return，APP 用作者原本的配色
 *   其它   → 正常翻成浅色
 * 所以这个文件只负责「读写这个键 + 广播变更」，不参与任何配色计算；
 * 设置页的开关和守卫脚本共用同一份状态，不会各说各话。
 */

export const FORCE_LIGHT_STORAGE_KEY = "ai-phone:force-light";
export const FORCE_LIGHT_CHANGED_EVENT = "ai-phone:force-light-changed";

export function readForceLightEnabled(): boolean {
  if (typeof window === "undefined") {
    return true;
  }
  try {
    return window.localStorage.getItem(FORCE_LIGHT_STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function writeForceLightEnabled(enabled: boolean): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    if (enabled) {
      window.localStorage.removeItem(FORCE_LIGHT_STORAGE_KEY);
    } else {
      window.localStorage.setItem(FORCE_LIGHT_STORAGE_KEY, "off");
    }
  } catch {
    // 隐私模式 / 存储被禁：开关状态存不下就算了，别让设置页崩掉
  }
  window.dispatchEvent(new CustomEvent(FORCE_LIGHT_CHANGED_EVENT, { detail: { enabled } }));
}
