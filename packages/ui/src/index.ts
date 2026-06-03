// @meche/ui — shared React Native design system.

// Tokens re-exported from core so screens import everything from one place.
export {
  MPAL,
  PPAL,
  pOnDark,
  FONTS,
  TYPE,
  RADIUS,
  mt,
  type Lang,
  type MKey,
} from '@meche/core';

export { AppProviders } from './providers';
export { fontMap } from './theme/fonts';
export { useLang, useLangStore, useT } from './i18n';
export { useToast, useSheet, type SheetOption } from './feedback';

export { MWordmark, type MWordmarkProps } from './components/MWordmark';
export { PWordmark } from './components/PWordmark';
export { MMark, type MMarkProps, type MarkColorway } from './components/MMark';
export { MIcon, type MIconName, type MIconProps } from './components/MIcon';
export { MText, type MTextProps } from './components/Type';
export { PrimaryButton, type PrimaryButtonProps } from './components/PrimaryButton';
export { MPortrait, type MPortraitProps } from './components/MPortrait';
export { TabBar, type TabBarProps, type B2CTab } from './components/TabBar';
export { PTabBar, type PTabBarProps, type ProTab } from './components/PTabBar';
export { Slider, type SliderProps } from './components/Slider';
export { TopBar, type TopBarProps } from './components/TopBar';
export { Card, type CardProps } from './components/Card';
export { TextField, type TextFieldProps } from './components/TextField';
