const KEY = 'player-name';
export const getSavedName = (): string => localStorage.getItem(KEY) ?? '';
export const saveName = (name: string): void => { if (name.trim()) localStorage.setItem(KEY, name.trim()); };
