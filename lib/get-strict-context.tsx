import { createContext, type ReactNode, use } from "react";

/**
 * Creates a strict context with a Provider and a hook that throws if used outside the provider.
 * Uses React 19's `use()` API instead of `useContext()` for improved performance.
 *
 * @example
 * ```tsx
 * const [Provider, useValue] = getStrictContext<{ count: number }>("Counter");
 *
 * function App() {
 *   return (
 *     <Provider value={{ count: 0 }}>
 *       <Counter />
 *     </Provider>
 *   );
 * }
 * ```
 */
function getStrictContext<T>(
  name?: string,
): readonly [
  ({
    value,
    children,
  }: {
    value: T;
    children?: ReactNode;
  }) => React.JSX.Element,
  () => T,
  React.Context<T | undefined>,
] {
  const Context = createContext<T | undefined>(undefined);

  function Provider({ value, children }: { value: T; children?: ReactNode }) {
    return <Context value={value}>{children}</Context>;
  }

  function useSafeContext(): T {
    const ctx = use(Context);
    if (ctx === undefined) {
      throw new Error(
        `use(${name ?? "Context"}) must be used within ${name ?? "a Provider"}`,
      );
    }
    return ctx;
  }

  return [Provider, useSafeContext, Context] as const;
}

export { getStrictContext };
