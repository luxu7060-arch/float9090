import type { IconId } from "@/lib/desktop-config";

type IconGlyphProps = {
  id: IconId;
  className?: string;
};

// 小黑猫贴纸图标映射表
const CAT_ICON_MAP: Partial<Record<IconId, string>> = {
  chat: "/icons/cat_chat.png",
  group_chat: "/icons/cat_chat.png",
  diary: "/icons/cat_diary.png",
  music: "/icons/cat_music.png",
  calendar: "/icons/cat_calendar.png",
  checkphone: "/icons/cat_checkphone.png",
  shopping: "/icons/cat_shopping.png",
  reading: "/icons/cat_reading.png",
  mixology: "/icons/cat_cocktail.png",
  settings: "/icons/cat_settings.png",
  theme: "/icons/cat_theme.png",
  characters: "/icons/cat_profile.png",
  resources: "/icons/cat_settings.png",
  resource_hub: "/icons/cat_market.png",
  cocreate: "/icons/cat_feather.png",
  game: "/icons/cat_game.png",
  appmarket: "/icons/cat_market.png",
  xiaohongshu: "/icons/cat_redbook.png",
  dwelling: "/icons/cat_dwelling.png",
  story: "/icons/cat_story.png",
  director: "/icons/cat_story.png",
  interview_magazine: "/icons/cat_diary.png",
  moments: "/icons/cat_camera.png",
  worldbuilder: "/icons/sample_black_cat.png",
  qa: "/icons/cat_settings.png",
  realitybridge: "/icons/sample_black_cat.png",
  mapmode: "/icons/cat_story.png",
  vnmode: "/icons/cat_story.png",
  vnplay: "/icons/cat_music.png",
  vnchapters: "/icons/cat_reading.png",
};

export function IconGlyph({ id, className }: IconGlyphProps) {
  const catSrc = CAT_ICON_MAP[id] || "/icons/sample_black_cat.png";

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
