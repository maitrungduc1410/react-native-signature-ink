/* eslint-disable @typescript-eslint/no-unused-vars */
// Ambient shim so the spec file can import the codegen helper types by
// literal name (required so React Native codegen, which scans source text,
// recognizes `DirectEventHandler<...>` etc.). The `react-native-strict-api`
// TypeScript condition hides the real path, hence this declaration.

declare module 'react-native/Libraries/Types/CodegenTypesNamespace' {
  import type { NativeSyntheticEvent } from 'react-native';

  export type BubblingEventHandler<
    T,
    PaperName extends string | never = never,
  > = (event: NativeSyntheticEvent<T>) => void | Promise<void>;

  export type DirectEventHandler<
    T,
    PaperName extends string | never = never,
  > = (event: NativeSyntheticEvent<T>) => void | Promise<void>;

  export type Double = number;
  export type Float = number;
  export type Int32 = number;
  export type UnsafeObject = object;
  export type UnsafeMixed = unknown;

  export type WithDefault<
    Type extends number | boolean | string | ReadonlyArray<string>,
    Value extends Type | string | undefined | null,
  > = Type | undefined | null;
}
