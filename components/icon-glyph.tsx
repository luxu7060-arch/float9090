import type { IconId } from "@/lib/desktop-config";

type IconGlyphProps = {
  id: IconId;
  className?: string;
};

// 小黑猫贴纸图标映射表
const ICON_MAP: Partial<Record<IconId, string>> = {
  chat: "/icons/chat.png",
  group_chat: "/icons/chat.png",
  diary: "/icons/diary.png",
  music: "/icons/music.png",
  calendar: "/icons/calendar.png",
  checkphone: "/icons/checkphone.png",
  shopping: "/icons/shopping.png",
  reading: "/icons/reading.png",
  mixology: "/icons/special_blend.png",
  settings: "/icons/settings.png",
  theme: "/icons/theme.png",
  characters: "/icons/character.png",
  resources: "/icons/settings.png",
  resource_hub: "/icons/resource_market.png",
  cocreate: "/icons/co_creation.png",
  game: "/icons/game.png",
  appmarket: "/icons/app_store.png",
  xiaohongshu: "/icons/xiaohongshu.png",
  dwelling: "/icons/sanctuary.png",
  story: "/icons/story.png",
  director: "/icons/story.png",
  interview_magazine: "/icons/present.png",
  moments: "/icons/camera.png",
  worldbuilder: "/icons/world_building.png",
  qa: "/icons/settings.png",
  realitybridge: "/icons/ios_bridge.png",
  mapmode: "/icons/story.png",
  vnmode: "/icons/story.png",
  vnplay: "/icons/music.png",
  vnchapters: "/icons/reading.png",
};

export function IconGlyph({ id, className }: IconGlyphProps) {
  const catSrc = ICON_MAP[id] || "/icons/default_icon.png";

  return (
    <img
      src={catSrc}
      alt={id}
      className={`cat-app-sticker-glyph ${className || ""}`}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "contain",
        filter: "drop-shadow(0 3px 6px rgba(0, 0, 0, 0.12))",
        pointerEvents: "none",
        userSelect: "none",
      }}
      draggable={false}
    />
  );
}

export function CustomAppGlyph({ seed, className }: { seed?: string; className?: string }) {
  return (
    <img
      src="/icons/sample_black_cat.png"
      alt={seed || "app"}
      className={`cat-app-sticker-glyph ${className || ""}`}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "contain",
        filter: "drop-shadow(0 3px 6px rgba(0, 0, 0, 0.12))",
        pointerEvents: "none",
        userSelect: "none",
      }}
      draggable={false}
    />
  );
}

export function customAppGlyphPath(_seed?: string): string {
  return "";
}
