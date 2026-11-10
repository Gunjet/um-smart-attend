/**
 * Messenger, Facebook, Instagram зэрэг апп доторх хөтчүүд cookie-г найдвартай
 * хадгалдаггүй. Оюутны "нэг төхөөрөмж" дүрэм cookie-д тулгуурладаг тул
 * эдгээрээс нэвтрэхэд дараа нь "өөр төхөөрөмж" гэж гарна.
 */
const IN_APP_BROWSERS: { name: string; pattern: RegExp }[] = [
  { name: "Messenger", pattern: /Messenger|MessengerForiOS|\bOrca-Android\b/i },
  { name: "Facebook", pattern: /FBAN|FBAV|FB_IAB|FBIOS|FB4A/i },
  { name: "Instagram", pattern: /Instagram/i },
  { name: "TikTok", pattern: /musical_ly|BytedanceWebview|TikTok/i },
  { name: "Line", pattern: /\bLine\//i },
  { name: "KakaoTalk", pattern: /KAKAOTALK/i },
  { name: "Snapchat", pattern: /Snapchat/i },
  { name: "Telegram", pattern: /Telegram/i },
  // Бусад Android апп доторх WebView.
  { name: "апп", pattern: /; wv\)/i },
];

/** Апп доторх хөтөч бол аппын нэрийг, үгүй бол null буцаана. */
export function detectInAppBrowser(userAgent: string): string | null {
  return (
    IN_APP_BROWSERS.find(({ pattern }) => pattern.test(userAgent))?.name ?? null
  );
}

export const isAndroid = (userAgent: string) => /Android/i.test(userAgent);
export const isIOS = (userAgent: string) => /iPhone|iPad|iPod/i.test(userAgent);
