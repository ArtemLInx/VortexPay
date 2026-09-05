/**
 * Save/load the trainer's progress in the browser's localStorage,
 * so progress isn't lost between visits (on this device).
 */

const STORAGE_KEY = "vortexpay_state_v1";

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (err) {
    console.error("Failed to save progress:", err);
    return false;
  }
}

export function clearState() {
  localStorage.removeItem(STORAGE_KEY);
}
