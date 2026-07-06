import { create } from 'zustand';

// Holds the in-progress in-chair try-on across the flow: the client's selfie, the brief, and the
// generated result. Simpler than the B2C store: no feed/direct/surprise paths in the pro app.
export interface TryBrief {
  prompt?: string;
  lookName?: string;
  /** Optional client first name — drives the per-client history filter. */
  clientName?: string;
}
export interface TryResult {
  /** display URI of the generated image */
  uri: string;
  match: number;
  generationId?: string;
  name?: string;
}

interface TryState {
  selfieBase64: string | null;
  mimeType: string;
  brief: TryBrief;
  /** When set, the next /generate is a REFINE of this generation: the server reloads its selfie +
   *  previous result and feeds BOTH to the model with the new brief. Consumed once by the loader. */
  refineFrom: string | null;
  result: TryResult | null;
  setSelfie: (base64: string, mimeType: string) => void;
  setBrief: (brief: TryBrief) => void;
  setRefine: (refineFrom: string | null) => void;
  setResult: (result: TryResult | null) => void;
  reset: () => void;
}

export const useTryStore = create<TryState>((set) => ({
  selfieBase64: null,
  mimeType: 'image/jpeg',
  brief: {},
  refineFrom: null,
  result: null,
  setSelfie: (selfieBase64, mimeType) => set({ selfieBase64, mimeType }),
  setBrief: (brief) => set({ brief }),
  setRefine: (refineFrom) => set({ refineFrom }),
  setResult: (result) => set({ result }),
  // Clear EVERY per-run field so a stale brief/refine can't leak into the next client's try-on.
  reset: () => set({ selfieBase64: null, brief: {}, result: null, refineFrom: null }),
}));
