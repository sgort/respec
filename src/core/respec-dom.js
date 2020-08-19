// @ts-check
/**
 * This module adds a `respec` object to the `document` object with following
 * readonly properties:
 *  - version: returns version of ReSpec Script.
 *  - ready: returns a promise that settles when ReSpec finishes processing.
 *
 * As document.respec is also an EventTarget, it handles two special events:
 * "error" and "warning", whose details contain a { message: string } object.
 *
 * This module also adds the legacy `document.respecIsReady` property for
 * backward compatibility. It is now an alias to `document.respec.ready`.
 */
import { sub } from "./pubsubhub.js";

export const name = "core/respec-dom";

const isReadySymbol = Symbol("isReady");
class ReSpecDOM extends EventTarget {
  constructor() {
    super();
    this[isReadySymbol] = new Promise(resolve => {
      sub("end-all", resolve, { once: true });
    });
  }

  get version() {
    return window.respecVersion;
  }

  /** @returns {Promise<void>} */
  get ready() {
    return this[isReadySymbol];
  }
}

export function init() {
  const respec = new ReSpecDOM(); // a singleton
  Object.defineProperty(document, "respec", { get: () => respec });
  Object.defineProperty(document, "respecIsReady", {
    get() {
      console.warn(
        "`document.respecIsReady` is deprecated in favor of `document.respec.ready`."
      );
      return respec.ready;
    },
  });

  document.dispatchEvent(new CustomEvent("respec-start"));

  sub("error", err => {
    const rsError = { message: err.message || err };
    console.error(rsError.message, err.stack);
    const event = new CustomEvent("error", { detail: rsError });
    document.respec.dispatchEvent(event);
  });
  sub("warn", err => {
    const rsError = { message: err.message || err };
    console.warn(rsError.message);
    const event = new CustomEvent("warning", { detail: rsError });
    document.respec.dispatchEvent(event);
  });
}
