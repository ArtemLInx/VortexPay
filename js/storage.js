/**
 * Сохранение/загрузка прогресса тренажёра в localStorage браузера,
 * чтобы прогресс не терялся между визитами (на этом устройстве).
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
    console.error("Не удалось сохранить прогресс:", err);
    return false;
  }
}

export function clearState() {
  localStorage.removeItem(STORAGE_KEY);
}
