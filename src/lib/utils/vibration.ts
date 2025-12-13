/**
 * Utility functions for device vibration
 */

/**
 * Check if vibration is supported on the current device
 */
export function isVibrationSupported(): boolean {
  return 'vibrate' in navigator;
}

/**
 * Vibrate with a custom pattern
 * @param pattern Array of vibration durations in milliseconds
 * @example vibrate([200, 100, 200]) // vibrate 200ms, pause 100ms, vibrate 200ms
 */
export function vibrate(pattern: number | number[]): boolean {
  if (!isVibrationSupported()) {
    console.warn('[Vibration] Vibration not supported on this device');
    return false;
  }

  try {
    navigator.vibrate(pattern);
    return true;
  } catch (error) {
    console.warn('[Vibration] Error vibrating:', error);
    return false;
  }
}

/**
 * Stop any ongoing vibration
 */
export function stopVibration(): void {
  if (isVibrationSupported()) {
    try {
      navigator.vibrate(0);
    } catch (error) {
      console.warn('[Vibration] Error stopping vibration:', error);
    }
  }
}

/**
 * Predefined vibration patterns
 */
export const VibrationPatterns = {
  /** Short single vibration (100ms) */
  SHORT: [100],
  /** Medium single vibration (200ms) */
  MEDIUM: [200],
  /** Long single vibration (400ms) */
  LONG: [400],
  /** Double vibration (200ms, pause 100ms, vibrate 200ms) */
  DOUBLE: [200, 100, 200],
  /** Triple vibration (200ms, pause 100ms, vibrate 200ms, pause 100ms, vibrate 200ms) */
  TRIPLE: [200, 100, 200, 100, 200],
  /** Alert pattern (long vibration) */
  ALERT: [400, 200, 400],
  /** Heartbeat pattern */
  HEARTBEAT: [100, 50, 100, 50, 200],
} as const;

/**
 * Vibrate with a predefined pattern
 */
export function vibratePattern(pattern: keyof typeof VibrationPatterns): boolean {
  return vibrate(VibrationPatterns[pattern]);
}

