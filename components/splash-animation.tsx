"use client";

import React, { useEffect, useState } from "react";

export function SplashAnimation() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#FFF9FD",
        overflow: "hidden",
        userSelect: "none"
      }}
    >
      <style>{`
        /* 水滴坠落 */
        @keyframes dropletFall {
          0% {
            top: 20px;
            opacity: 0;
            transform: translateX(-50%) scale(0.6);
          }
          30% {
            opacity: 0.95;
            transform: translateX(-50%) scale(1);
          }
          95% {
            top: 140px;
            opacity: 1;
            transform: translateX(-50%) scaleY(1.3);
          }
          100% {
            top: 140px;
            opacity: 0;
            transform: translateX(-50%) scale(2, 0.2);
          }
        }

        /* 破水第一涟漪 */
        @keyframes splashRingBurst {
          0% {
            width: 4px;
            height: 4px;
            opacity: 1;
            box-shadow: 0 0 10px #FFC9E4;
          }
          100% {
            width: 250px;
            height: 250px;
            opacity: 0;
            box-shadow: 0 0 24px rgba(199, 155, 255, 0);
          }
        }

        /* 同心微波扩散 */
        @keyframes waterRingExpand {
          0% {
            width: 20px;
            height: 20px;
            opacity: 0.9;
            transform: scale(0.6);
            border-color: rgba(255, 201, 228, 0.85);
          }
          50% {
            opacity: 0.42;
            border-color: rgba(199, 155, 255, 0.5);
          }
          100% {
            width: 290px;
            height: 290px;
            opacity: 0;
            transform: scale(1.15);
            border-color: rgba(199, 155, 255, 0);
          }
        }

        /* 星尘微漂 */
        @keyframes dustDrift {
          0% { opacity: 0; transform: translateY(0) scale(0.6); }
          25% { opacity: 0.75; transform: translateY(-8px) scale(1); }
          75% { opacity: 0.5; transform: translateY(-16px) scale(0.8); }
          100% { opacity: 0; transform: translateY(-24px) scale(0.4); }
        }

        /* 核心字升华定格 */
        @keyframes floatTitleEmerge {
          0% {
            opacity: 0;
            transform: translateY(22px);
          }
          65% {
            opacity: 0.95;
            transform: translateY(-2px);
          }
          100% {
            opacity: 0.95;
            transform: translateY(0);
          }
        }

        /* 副标题淡入 */
        @keyframes subTitleFadeIn {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 0.9;
            transform: translateY(0);
          }
        }
      `}</style>

      {/* 手机屏幕顶部角标 */}
      <div
        style={{
          position: "absolute",
          top: "34px",
          left: "24px",
          fontSize: "10px",
          letterSpacing: "0.22em",
          color: "rgba(147, 83, 224, 0.45)",
          fontFamily: "ui-monospace, monospace",
          textTransform: "uppercase",
          pointerEvents: "none"
        }}
      >
        Float / 0.1
      </div>
      <div
        style={{
          position: "absolute",
          top: "34px",
          right: "24px",
          fontSize: "10px",
          letterSpacing: "0.22em",
          color: "rgba(147, 83, 224, 0.45)",
          fontFamily: "ui-monospace, monospace",
          textTransform: "uppercase",
          pointerEvents: "none"
        }}
      >
        quiet moment
      </div>

      {/* 水波扩散舞台 */}
      <div
        style={{
          position: "relative",
          width: "280px",
          height: "280px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        {/* 1. 晨露滴落 */}
        <div
          style={{
            position: "absolute",
            width: "6px",
            height: "12px",
            borderRadius: "50%",
            left: "50%",
            background: "linear-gradient(to bottom, rgba(255, 255, 255, 0.95), rgba(199, 155, 255, 0.85))",
            boxShadow: "0 2px 8px rgba(199, 155, 255, 0.45)",
            animation: "dropletFall 0.75s cubic-bezier(0.55, 0.05, 0.675, 0.19) 0.15s forwards",
            opacity: 0,
            pointerEvents: "none",
            zIndex: 5
          }}
        />

        {/* 2. 第一道清脆破水涟漪 */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
            border: "1.5px solid rgba(255, 201, 228, 0.9)",
            animation: "splashRingBurst 1.8s cubic-bezier(0.1, 0.8, 0.25, 1) 0.82s forwards",
            opacity: 0,
            pointerEvents: "none",
            zIndex: 3
          }}
        />

        {/* 3. 同心柔和扩散环 */}
        <div
          style={{
            position: "absolute",
            borderRadius: "50%",
            border: "1px solid rgba(199, 155, 255, 0.55)",
            boxShadow: "0 0 16px rgba(255, 201, 228, 0.22), inset 0 0 12px rgba(199, 155, 255, 0.12)",
            animation: "waterRingExpand 4.8s cubic-bezier(0.12, 0.2, 0.25, 1) 1.2s infinite",
            opacity: 0,
            pointerEvents: "none"
          }}
        />
        <div
          style={{
            position: "absolute",
            borderRadius: "50%",
            border: "1px solid rgba(199, 155, 255, 0.55)",
            boxShadow: "0 0 16px rgba(255, 201, 228, 0.22), inset 0 0 12px rgba(199, 155, 255, 0.12)",
            animation: "waterRingExpand 4.8s cubic-bezier(0.12, 0.2, 0.25, 1) 2.8s infinite",
            opacity: 0,
            pointerEvents: "none"
          }}
        />
        <div
          style={{
            position: "absolute",
            borderRadius: "50%",
            border: "1px solid rgba(199, 155, 255, 0.55)",
            boxShadow: "0 0 16px rgba(255, 201, 228, 0.22), inset 0 0 12px rgba(199, 155, 255, 0.12)",
            animation: "waterRingExpand 4.8s cubic-bezier(0.12, 0.2, 0.25, 1) 4.4s infinite",
            opacity: 0,
            pointerEvents: "none"
          }}
        />

        {/* 4. 浮游星尘 */}
        <div
          style={{
            position: "absolute",
            width: "3px",
            height: "3px",
            borderRadius: "50%",
            backgroundColor: "#FFC9E4",
            top: "38%",
            left: "22%",
            animation: "dustDrift 6s ease-in-out 1.6s infinite",
            opacity: 0,
            pointerEvents: "none"
          }}
        />
        <div
          style={{
            position: "absolute",
            width: "2.5px",
            height: "2.5px",
            borderRadius: "50%",
            backgroundColor: "#C79BFF",
            top: "62%",
            left: "78%",
            animation: "dustDrift 6s ease-in-out 2.1s infinite",
            opacity: 0,
            pointerEvents: "none"
          }}
        />
        <div
          style={{
            position: "absolute",
            width: "3px",
            height: "3px",
            borderRadius: "50%",
            backgroundColor: "#FFD4EA",
            top: "30%",
            left: "70%",
            animation: "dustDrift 6s ease-in-out 2.8s infinite",
            opacity: 0,
            pointerEvents: "none"
          }}
        />

        {/* 5. 核心 2号天选字形 Float (初始完全隐身 opacity: 0，随水波破水升华) */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: 0,
            animation: "floatTitleEmerge 1.6s cubic-bezier(0.16, 1, 0.3, 1) 0.85s forwards"
          }}
        >
          <img
            src="data:image/png;base64,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"
            alt="Float"
            style={{
              width: "195px",
              height: "auto",
              display: "block",
              filter: "drop-shadow(0 4px 14px rgba(199, 155, 255, 0.28))"
            }}
          />
        </div>
      </div>

      {/* 6. 极简诗意文案 (初始完全隐身 opacity: 0，字定格后平滑浮现) */}
      <div
        style={{
          marginTop: "18px",
          fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif",
          fontSize: "10.5px",
          letterSpacing: "0.35em",
          color: "#A3809C",
          textTransform: "uppercase",
          paddingLeft: "0.35em",
          opacity: 0,
          animation: "subTitleFadeIn 1.4s cubic-bezier(0.16, 1, 0.3, 1) 1.6s forwards"
        }}
      >
        LET THE WORLD WAIT
      </div>
      <div
        style={{
          marginTop: "6px",
          fontFamily: "-apple-system, BlinkMacSystemFont, PingFang SC, Hiragino Sans GB, Microsoft YaHei, sans-serif",
          fontSize: "11px",
          letterSpacing: "0.24em",
          color: "rgba(163, 128, 156, 0.72)",
          fontWeight: 300,
          paddingLeft: "0.24em",
          opacity: 0,
          animation: "subTitleFadeIn 1.4s cubic-bezier(0.16, 1, 0.3, 1) 1.8s forwards"
        }}
      >
        外面的世界，晚一点再说
      </div>
    </div>
  );
}
