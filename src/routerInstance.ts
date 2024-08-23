/**
 * Global single instance of Router using window object if available.
 * If window is not available use RouterCtrl to control the Router instance from outside.
 */
import {
    Router,
} from "./Router";

export const router = new Router(typeof window !== "undefined" ? window : undefined);
