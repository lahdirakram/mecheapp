import React from 'react';
import { PanResponder, View } from 'react-native';
import { MPAL } from '@meche/core';
import { MText } from './Type';

export interface SliderProps {
  label: string;
  /** 0–1 */
  value: number;
  onChange: (v: number) => void;
  /** Exactly three notch labels: [<0.34, <0.67, else]. */
  notches: [string, string, string];
  accent?: string;
}

/** Manual tweak slider (MSlider / PSlider). Handle is white with an accent ring. */
export function Slider({ label, value, onChange, notches, accent = MPAL.sable }: SliderProps) {
  const [width, setWidth] = React.useState(0);
  const widthRef = React.useRef(0);
  widthRef.current = width;

  const setFromX = React.useCallback(
    (x: number) => {
      const w = widthRef.current;
      if (w <= 0) return;
      onChange(Math.max(0, Math.min(1, x / w)));
    },
    [onChange],
  );

  const responder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => setFromX(e.nativeEvent.locationX),
        onPanResponderMove: (e) => setFromX(e.nativeEvent.locationX),
      }),
    [setFromX],
  );

  const notch = value < 0.34 ? notches[0] : value < 0.67 ? notches[1] : notches[2];
  const pct = Math.max(0, Math.min(1, value));

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <MText variant="bodyMedium" size={14} color={MPAL.ink}>
          {label}
        </MText>
        <MText variant="mono" size={10} color={MPAL.mute}>
          {notch}
        </MText>
      </View>
      <View
        {...responder.panHandlers}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={{ height: 28, justifyContent: 'center' }}
      >
        {/* track */}
        <View style={{ height: 4, borderRadius: 2, backgroundColor: MPAL.border }} />
        {/* fill */}
        <View style={{ position: 'absolute', left: 0, height: 4, borderRadius: 2, width: `${pct * 100}%`, backgroundColor: accent }} />
        {/* handle */}
        <View
          style={{
            position: 'absolute',
            left: `${pct * 100}%`,
            marginLeft: -11,
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: '#fff',
            borderWidth: 2,
            borderColor: accent,
            shadowColor: '#000',
            shadowOpacity: 0.18,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 2 },
            elevation: 3,
          }}
        />
      </View>
    </View>
  );
}
