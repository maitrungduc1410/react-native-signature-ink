// Native (iOS/Android) entry — re-exports the raw codegen component.
// The high-level wrapper with the imperative API lives in
// `SignatureInk.tsx`; this file is the escape hatch for consumers who
// want to drive the Fabric component directly.
export { default as SignatureInkView } from './SignatureInkViewNativeComponent';
export type { NativeProps as SignatureInkViewNativeProps } from './SignatureInkViewNativeComponent';
