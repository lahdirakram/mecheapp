import { create } from 'zustand';

// Holds the in-progress try-on across the flow: the captured selfie, the brief assembled from
// whichever path the user took, and the generated result.
export interface TryBrief {
  prompt?: string;
  lookName?: string;
  length?: number;
  color?: string;
  fringe?: number;
}
export interface TryResult {
  /** public URL of the generated image */
  uri: string;
  match: number;
  generationId?: string;
  /** display name derived from the brief, for "Mes mèches" */
  name?: string;
  /** id of the auto-saved looks row (so the heart can toggle "loved") */
  savedLookId?: string;
}

interface TryState {
  selfieBase64: string | null;
  mimeType: string;
  brief: TryBrief;
  /** true when a specific look was chosen (feed / gallery) → after the selfie, generate directly
   *  instead of asking "Ton idée". Carried here (not in the URL) so it survives re-navigation. */
  directMode: boolean;
  /** true for "coupe surprise" → after the selfie, send the user to "L'IA te propose" so Mèche
   *  picks a cut from the selfie, instead of the "Ton idée" hub. */
  surprise: boolean;
  result: TryResult | null;
  setSelfie: (base64: string, mimeType: string) => void;
  setBrief: (brief: TryBrief) => void;
  setDirect: (directMode: boolean) => void;
  setSurprise: (surprise: boolean) => void;
  setResult: (result: TryResult | null) => void;
  reset: () => void;
}

export const useTryStore = create<TryState>((set) => ({
  selfieBase64: null,
  mimeType: 'image/jpeg',
  brief: {},
  directMode: false,
  surprise: false,
  result: null,
  setSelfie: (selfieBase64, mimeType) => set({ selfieBase64, mimeType }),
  setBrief: (brief) => set({ brief }),
  setDirect: (directMode) => set({ directMode }),
  setSurprise: (surprise) => set({ surprise }),
  setResult: (result) => set({ result }),
  // Clear EVERY per-run field — directMode/surprise leaked across flows before, regenerating a
  // stale look on a fresh "surprise"/"+" entry.
  reset: () => set({ selfieBase64: null, brief: {}, result: null, directMode: false, surprise: false }),
}));
