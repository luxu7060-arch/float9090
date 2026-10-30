"use client";

import { useEffect } from "react";

import {
  isCoarsePointerDevice,
  isShellWebView,
  lockPortraitOrientation,
  shouldRequestPwaFullscreen,
  unlockOrientation,
} from "@/lib/pwa-display-mode";

/**
 * 安卓全屏兜底：点击屏幕进入全屏模式（iOS 不支持此 API，会自动忽略）。
 *
 * world-builder（筑境）通过 window.open 开在独立窗口，不在 main-app 的 React 树内，
 * 因此拿不到 main-app 里那段「点击进全屏」的监听，会一直露出浏览器地址栏。
 * 这个组件把同一套逻辑复刻到 world-builder 窗口，挂上即可。
 */
export function AndroidFullscreen() {
  useEffect(() => {
    // 用「粗指针」判断而不是宽度：横屏时视口超过 500px，旧写法会整个失效。
    if (!isCoarsePointerDevice() || isShellWebView()) return;

    // 同 main-app：用户主动退出全屏后静默 30 秒，别每次点击都把提示条再弹一遍。
    const RETRY_COOLDOWN_MS = 30_000;
    const MIN_GAP_MS = 2_000;
    let lastAttemptAt = 0;
    let lastExitAt = 0;

    function tryFullscreen() {
      if (!shouldRequestPwaFullscreen()) return;
      if (document.fullscreenElement) return;
      const now = Date.now();
      if (now - lastExitAt < RETRY_COOLDOWN_MS) return;
      if (now - lastAttemptAt < MIN_GAP_MS) return;
      lastAttemptAt = now;
      document.documentElement.requestFullscreen?.()
        .then(() => lockPortraitOrientation())
        .catch(() => { });
    }
    function handleFullscreenChange() {
      if (document.fullscreenElement) {
        void lockPortraitOrientation();
      } else {
        lastExitAt = Date.now();
        unlockOrientation();
      }
    }
    document.addEventListener("click", tryFullscreen);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("click", tryFullscreen);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  return null;
}
