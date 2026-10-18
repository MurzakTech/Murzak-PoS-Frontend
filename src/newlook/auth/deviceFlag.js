/**
 * The device-only New look flag (ticket P5-5).
 *
 * Signing in happens before anyone is known, so the shop's New look switch (kept on the server, see NewLookProvider) cannot be asked
 * yet. Whenever NewLookProvider learns the switch it also writes the answer here, on this device only: '1' for on, '0' for off. The
 * sign-in page reads it to choose which design to show. With no value at all (this device has never been signed in, or storage is
 * blocked), or '0', the sign-in is the current one, exactly as before the redesign.
 *
 * The key deliberately does not start with "murzak_new_look:" because NewLookProvider keeps its per-shop answers under that prefix
 * followed by the shop's name, and a shop named "device" would otherwise share this key. It is not in the list of things a sign-out
 * removes (src/utils/session.js), because it is a device setting like the theme choice and holds no personal data.
 */
export const DEVICE_KEY = 'murzak_new_look_device';

/** True only when this device last learned that the shop's New look is on */
export const readDeviceFlag = () => {
  try {
    return localStorage.getItem(DEVICE_KEY) === '1';
  } catch (e) {
    return false; // storage can be unavailable (private mode): show the current sign-in
  }
};

export const writeDeviceFlag = (enabled) => {
  try {
    localStorage.setItem(DEVICE_KEY, enabled ? '1' : '0');
  } catch (e) {
    // Not critical; the next sign-in on this device just shows the current page
  }
};
