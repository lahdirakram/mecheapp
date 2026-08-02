// Subpath imports of react-native-fbsdk-next (see lib/marketing.ts for why the package index
// must never be imported). The package ships no per-file typings, so declare them untyped.
declare module 'react-native-fbsdk-next/lib/module/FBSettings' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Settings: any;
  export default Settings;
}
declare module 'react-native-fbsdk-next/lib/module/FBAppEventsLogger' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const AppEventsLogger: any;
  export default AppEventsLogger;
}
