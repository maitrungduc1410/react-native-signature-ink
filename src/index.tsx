// Public entry point.
//   • `SignatureInk` — recommended. High-level wrapper with a ref-based
//     imperative API (`toBase64`, `undo`, `replay`, …).
//   • `SignatureInkView` — advanced. Raw codegen Fabric component if
//     you prefer to drive props/commands yourself.
export { SignatureInk } from './SignatureInk';
export { default as SignatureInkView } from './SignatureInkViewNativeComponent';
export type { NativeProps as SignatureInkViewNativeProps } from './SignatureInkViewNativeComponent';
export type {
  BaselineStyle,
  ChangeEvent,
  ExportFormat,
  ExportImageOptions,
  InkType,
  ReplayOptions,
  ReplayProgressEvent,
  SavedToPhotoLibraryResult,
  SignatureInkHandle,
  SignatureInkProps,
  StrokeData,
  StrokePoint,
  ToolbarActionEvent,
  ToolbarButton,
  ToolbarPosition,
} from './types';
