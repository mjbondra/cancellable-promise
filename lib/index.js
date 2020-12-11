"use strict";

const CANCELLABLE_PROMISE_ON_CANCEL = Symbol("CancellablePromiseOnCancel");
const CANCELLABLE_PROMISE_REJECT = Symbol("CancellablePromiseReject");
const CANCELLABLE_PROMISE_RESOLVE = Symbol("CancellablePromiseResolve");
const NATIVE_PROMISE = Symbol("NativePromise");
const STATE = Symbol("CancellablePromiseState");

const CANCELLED = "cancelled";
const FULFILLED = "fulfilled";
const PENDING = "pending";
const REJECTED = "rejected";

const ABORT_ERROR = "AbortError";

const noop = () => null;

class AbortError extends Error {
  constructor(msg) {
    super(msg);
    this.name = ABORT_ERROR;
  }
}

class CancellablePromise extends Promise {
  constructor(executor, signal) {
    const native = { resolve: noop, reject: noop };
    super((resolve, reject) => {
      native.resolve = resolve;
      native.reject = reject;
    });
    this[NATIVE_PROMISE] = native;
    this[STATE] = PENDING;

    if (signal) {
      const abort = () => this.cancel();
      signal.addEventListener("abort", abort);
      super
        .finally(() => signal.removeEventListener("abort", abort))
        .catch(noop);
    }

    executor(
      this[CANCELLABLE_PROMISE_RESOLVE].bind(this),
      this[CANCELLABLE_PROMISE_REJECT].bind(this),
      this[CANCELLABLE_PROMISE_ON_CANCEL].bind(this)
    );
  }

  cancel(msg) {
    if (this[STATE] === PENDING) {
      this[STATE] = CANCELLED;
      this[NATIVE_PROMISE].reject(new AbortError(msg));
    }
  }

  catch(onRejected) {
    const promise = super.catch(onRejected);
    promise.cancel = this.cancel.bind(this);
    return promise;
  }

  catchCancel(onCancelled) {
    const promise = super.catch((reason) => {
      if (reason && reason.name === ABORT_ERROR) return onCancelled(reason);
      throw reason;
    });
    promise.cancel = this.cancel.bind(this);
    return promise;
  }

  finally(onFinally) {
    const promise = super.finally(onFinally);
    promise.cancel = this.cancel.bind(this);
    return promise;
  }

  then(onFulfilled, onRejected) {
    const promise = super.then(onFulfilled, onRejected);
    promise.cancel = this.cancel.bind(this);
    return promise;
  }

  [CANCELLABLE_PROMISE_ON_CANCEL](onCancelled) {
    super.catch((reason) => {
      if (reason && reason.name === ABORT_ERROR) onCancelled(reason);
    });
  }

  [CANCELLABLE_PROMISE_REJECT](reason) {
    if (this[STATE] === PENDING) {
      this[STATE] = REJECTED;
      this[NATIVE_PROMISE].reject(reason);
    }
  }

  [CANCELLABLE_PROMISE_RESOLVE](value) {
    if (this[STATE] === PENDING) {
      this[STATE] = FULFILLED;
      this[NATIVE_PROMISE].resolve(value);
    }
  }
}

module.exports = CancellablePromise;
module.exports.AbortError = AbortError;
