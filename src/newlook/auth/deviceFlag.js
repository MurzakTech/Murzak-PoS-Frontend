/**
 * The device-only New look flag (ticket P5-5).
 *
 * Signing in happens before anyone is known, so the shop's New look switch (kept on the server, see NewLookProvider) cannot be asked
 * yet. Whenever NewLookProvider learns the switch it also writes the answer here, on this device only: '1' for on, '0' for off. The
 * sign-in page reads it to choose which design to show. The New look is the default for every shop, so a device that has never been
 * signed in (no value at all), or whose storage is blocked, gets the new sign-in. Only a '0', written when the shop's owner switched the
 * New look off, keeps the current sign-in. Both sign-in pages call the same sign-in code, so the choice changes how the page looks only.
 *
 * The key deliberately does not start with "murzak_new_look:" because NewLookProvider keeps its per-shop answers under that prefix
 * followed by the shop's name, and a shop named "device" would otherwise share this key. It is not in the list of things a sign-out
 * removes (src/utils/session.js), because it is a device setting like the theme choice and holds no personal data.
 */
export const DEVICE_KEY = 'murzak_new_look_device';

/** True unless this device last learned that the shop's owner switched the New look off */
export const readDeviceFlag = () => {
  try {
    return localStorage.getItem(DEVICE_KEY) !== '0';
  } catch (e) {
    return true; // storage can be unavailable (private mode): the New look is the default
  }
};

export const writeDeviceFlag = (enabled) => {
  try {
    localStorage.setItem(DEVICE_KEY, enabled ? '1' : '0');
  } catch (e) {
    // Not critical; the next sign-in on this device just shows the default page
  }
};
