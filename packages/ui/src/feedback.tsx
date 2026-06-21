import React from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONTS, MPAL, RADIUS } from '@meche/core';
import { MText } from './components/Type';
import { MIcon, type MIconName } from './components/MIcon';

// Cross-platform feedback (works on web AND native, unlike RN's Alert which is a no-op on web):
//   useToast()  → show a transient snackbar (optional leading icon)
//   useSheet()  → show a bottom action sheet

export interface ToastOptions {
  icon?: MIconName;
}
export interface SheetOption {
  label: string;
  onPress?: () => void;
  destructive?: boolean;
  cancel?: boolean;
}
interface SheetConfig {
  title?: string;
  message?: string;
  options: SheetOption[];
}

interface FeedbackCtx {
  toast: (message: string, opts?: ToastOptions) => void;
  sheet: (config: SheetConfig) => void;
}
const Ctx = React.createContext<FeedbackCtx | null>(null);

// A soft snackbar that fades + lifts into view, then drifts away.
function Toast({ message, icon, bottom }: { message: string; icon?: MIconName; bottom: number }) {
  const a = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [a]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom,
        alignItems: 'center',
        zIndex: 100,
        opacity: a,
        transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 9,
          maxWidth: '90%',
          paddingLeft: icon ? 14 : 18,
          paddingRight: 18,
          paddingVertical: 13,
          borderRadius: RADIUS.pill,
          backgroundColor: MPAL.ink,
          shadowColor: '#000',
          shadowOpacity: 0.28,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 8 },
        }}
      >
        {icon ? (
          <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: `${MPAL.sable}2E`, alignItems: 'center', justifyContent: 'center' }}>
            <MIcon name={icon} size={14} color={MPAL.sable} fill={icon === 'sparkle' ? MPAL.sable : 'none'} stroke={icon === 'sparkle' ? 0 : undefined} />
          </View>
        ) : null}
        <MText style={{ fontFamily: FONTS.bodyMedium, fontSize: 14, lineHeight: 19, color: MPAL.inkInv, flexShrink: 1 }}>{message}</MText>
      </View>
    </Animated.View>
  );
}

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = React.useState<{ message: string; icon?: MIconName; n: number } | null>(null);
  const [sheet, setSheet] = React.useState<SheetConfig | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const api = React.useMemo<FeedbackCtx>(
    () => ({
      toast: (message, opts) => {
        setToast((prev) => ({ message, icon: opts?.icon, n: (prev?.n ?? 0) + 1 }));
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setToast(null), 2800);
      },
      sheet: (config) => setSheet(config),
    }),
    [],
  );

  return (
    <Ctx.Provider value={api}>
      {children}

      {/* toast — keyed by `n` so each call replays the entrance animation */}
      {toast ? <Toast key={toast.n} message={toast.message} icon={toast.icon} bottom={insets.bottom + 96} /> : null}

      {/* action sheet (root overlay). Note: shown from a NATIVE modal screen (e.g. the result
          fullScreenModal) it would sit behind it on iOS — those screens use Alert.alert instead. */}
      {sheet ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 110, justifyContent: 'flex-end' }}>
          <Pressable onPress={() => setSheet(null)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' }} />
          <View style={{ backgroundColor: MPAL.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 10, paddingBottom: insets.bottom + 14, paddingHorizontal: 16 }}>
            <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: MPAL.border, marginBottom: 12 }} />
            {sheet.title ? (
              <MText variant="mono" size={11} color={MPAL.mute} style={{ textAlign: 'center', letterSpacing: 1.4, marginBottom: sheet.message ? 6 : 10 }}>
                {sheet.title.toUpperCase()}
              </MText>
            ) : null}
            {sheet.message ? (
              <MText size={13} color={MPAL.mute} style={{ textAlign: 'center', lineHeight: 18, marginBottom: 12, paddingHorizontal: 8 }}>
                {sheet.message}
              </MText>
            ) : null}
            {sheet.options.map((o, i) => (
              <Pressable
                key={i}
                onPress={() => {
                  setSheet(null);
                  o.onPress?.();
                }}
                style={{ paddingVertical: 15, borderRadius: RADIUS.card, alignItems: 'center', marginTop: i ? 6 : 0, backgroundColor: o.cancel ? 'transparent' : MPAL.paper, borderWidth: o.cancel ? 0 : 1, borderColor: MPAL.border }}
              >
                <MText style={{ fontFamily: o.cancel ? FONTS.bodyMedium : FONTS.bodySemibold, fontSize: 16, color: o.destructive ? MPAL.warn : o.cancel ? MPAL.mute : MPAL.ink }}>
                  {o.label}
                </MText>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </Ctx.Provider>
  );
}

function useFeedback(): FeedbackCtx {
  const v = React.useContext(Ctx);
  if (!v) throw new Error('useToast/useSheet must be used within <FeedbackProvider> (inside AppProviders)');
  return v;
}
export function useToast() {
  return useFeedback().toast;
}
export function useSheet() {
  return useFeedback().sheet;
}
