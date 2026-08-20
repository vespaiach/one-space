import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

vi.mock("@stylexjs/stylex", () => ({
  create: <T extends Record<string, Record<string, unknown>>>(styles: T) => styles,
  defineVars: <T extends Record<string, string>>(variables: T) => variables,
  keyframes: () => "toast-keyframes",
  props: (...styles: Array<Record<string, unknown> | false | null | undefined>) => ({
    style: Object.assign({}, ...styles.filter(Boolean)),
  }),
}));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
