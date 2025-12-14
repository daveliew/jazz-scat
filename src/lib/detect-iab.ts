/**
 * In-App Browser (IAB) Detection
 *
 * Detects when the app is running inside social media in-app browsers
 * (LinkedIn, Facebook, Instagram, etc.) which often block microphone access.
 */

interface IABInfo {
  isIAB: boolean;
  name: string | null;
}

/**
 * Detect if running in an in-app browser
 */
export function detectInAppBrowser(): IABInfo {
  if (typeof window === 'undefined') {
    return { isIAB: false, name: null };
  }

  const ua = navigator.userAgent || '';

  // IAB detection patterns with names
  const iabPatterns: Array<{ pattern: RegExp; name: string }> = [
    { pattern: /LinkedIn/i, name: 'LinkedIn' },
    { pattern: /FBAN|FBAV/i, name: 'Facebook' },
    { pattern: /Instagram/i, name: 'Instagram' },
    { pattern: /Twitter/i, name: 'Twitter' },
    { pattern: /Line\//i, name: 'Line' },
    { pattern: /KAKAOTALK/i, name: 'KakaoTalk' },
    { pattern: /Snapchat/i, name: 'Snapchat' },
    // Note: WhatsApp usually allows mic, but some versions don't
    { pattern: /WhatsApp/i, name: 'WhatsApp' },
  ];

  for (const { pattern, name } of iabPatterns) {
    if (pattern.test(ua)) {
      return { isIAB: true, name };
    }
  }

  return { isIAB: false, name: null };
}

/**
 * Check if running in any in-app browser
 */
export function isInAppBrowser(): boolean {
  return detectInAppBrowser().isIAB;
}

/**
 * Get the name of the in-app browser (e.g., "LinkedIn", "Facebook")
 */
export function getIABName(): string | null {
  return detectInAppBrowser().name;
}

/**
 * Get URL to open in system browser
 * On Android, we can use intent URLs to force system browser
 * On iOS, user needs to manually tap "Open in Safari"
 */
export function getOpenInBrowserUrl(): string {
  if (typeof window === 'undefined') return '';

  const currentUrl = window.location.href;

  // Check if Android
  const isAndroid = /Android/i.test(navigator.userAgent);

  if (isAndroid) {
    // Android intent URL to open in default browser
    return `intent://${currentUrl.replace(/^https?:\/\//, '')}#Intent;scheme=https;end`;
  }

  // For iOS and others, just return the current URL
  // User will need to tap "Open in Safari" in the IAB menu
  return currentUrl;
}

/**
 * Detect if device is iOS
 */
export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;

  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}
