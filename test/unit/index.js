"use strict";

const AbortController = require("abort-controller");
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
const dirtyChai = require("dirty-chai");
const sinon = require("sinon");
const sinonChai = require("sinon-chai");

const CancellablePromise = require("../../lib");

const { AbortError } = CancellablePromise;
const { expect } = chai;

chai.use(sinonChai);
chai.use(chaiAsPromised);
chai.use(dirtyChai);

describe("CancellablePromise", () => {
  it(`should resolve with expected value`, async () => {
    const value = "Foo";
    const promise = new CancellablePromise((resolve) =>
      setTimeout(() => resolve(value), 25)
    );
    await expect(promise).to.eventually.equal(value);
  });

  it(`should reject with expected reason`, async () => {
    const reason = new Error("Bar");
    const promise = new CancellablePromise((resolve, reject) =>
      setTimeout(() => reject(reason), 25)
    );
    await expect(promise).to.eventually.be.rejectedWith(reason);
  });

  it(`should reject with AbortError when CancellablePromise "cancel" method is called`, async () => {
    const value = "Foo";
    const promise = new CancellablePromise((resolve) =>
      setTimeout(() => resolve(value), 25)
    );
    promise.cancel();
    await expect(promise).to.eventually.be.rejectedWith(AbortError);
  });

  it(`should reject with AbortError when AbortController "signal" is passed to CancellablePromise constructor and AbortController "abort" method is called`, async () => {
    const value = "Foo";
    const controller = new AbortController();
    const promise = new CancellablePromise(
      (resolve) => setTimeout(() => resolve(value), 25),
      controller.signal
    );
    controller.abort();
    await expect(promise).to.eventually.be.rejectedWith(AbortError);
  });

  it(`should resolve CancellablePromise "then" method with expected value`, async () => {
    const value = "Foo";
    const chainedValue = "Baz";
    const promise = new CancellablePromise((resolve) =>
      setTimeout(() => resolve(value), 25)
    );
    const promiseChain = promise.then(() => chainedValue);
    await expect(promiseChain).to.eventually.equal(chainedValue);
  });

  it(`should catch error and resolve CancellablePromise "catch" method with expected value`, async () => {
    const reason = new Error("Bar");
    const chainedValue = "Baz";
    const promise = new CancellablePromise((resolve, reject) =>
      setTimeout(() => reject(reason), 25)
    );
    const promiseChain = promise.catch(() => chainedValue);
    await Promise.all([
      expect(promise).to.eventually.be.rejectedWith(reason),
      expect(promiseChain).to.eventually.equal(chainedValue),
    ]);
  });

  it(`should catch cancellation and resolve CancellablePromise "catchCancel" method with expected value`, async () => {
    const value = "Foo";
    const chainedValue = "Baz";
    const promise = new CancellablePromise((resolve) =>
      setTimeout(() => resolve(value), 25)
    );
    const promiseChain = promise.catchCancel(() => chainedValue);
    promise.cancel();
    await Promise.all([
      expect(promise).to.eventually.be.rejectedWith(AbortError),
      expect(promiseChain).to.eventually.equal(chainedValue),
    ]);
  });

  it(`should bypass CancellablePromise "catchCancel" when rejected with something other than AbortError`, async () => {
    const reason = new Error("Bar");
    const handleCancel = sinon.spy();
    const promise = new CancellablePromise((resolve, reject) =>
      setTimeout(() => reject(reason), 25)
    );
    const promiseChain = promise.catchCancel(handleCancel);
    await Promise.all([
      expect(promise).to.eventually.be.rejectedWith(reason),
      expect(promiseChain).to.eventually.be.rejectedWith(reason),
    ]);
  });

  it(`should call CancellablePromise "finally" method on fulfillment`, async () => {
    const value = "Foo";
    const handleFinally = sinon.spy();
    const promise = new CancellablePromise((resolve) =>
      setTimeout(() => resolve(value), 25)
    );
    const promiseChain = promise.finally(handleFinally);
    await Promise.all([
      expect(promise).to.eventually.equal(value),
      expect(promiseChain).to.eventually.be.fulfilled(),
    ]);
    expect(handleFinally).to.have.been.called();
  });

  it(`should call CancellablePromise "finally" method on rejection`, async () => {
    const reason = new Error("Bar");
    const handleFinally = sinon.spy();
    const promise = new CancellablePromise((resolve, reject) =>
      setTimeout(() => reject(reason), 25)
    );
    const promiseChain = promise.finally(handleFinally);
    await Promise.all([
      expect(promise).to.eventually.be.rejectedWith(reason),
      expect(promiseChain).to.eventually.be.rejected(),
    ]);
    expect(handleFinally).to.have.been.called();
  });

  it(`should call "onCancel" function when CancellablePromise is cancelled`, async () => {
    const value = "Foo";
    const handleCancel = sinon.spy();
    const promise = new CancellablePromise((resolve, reject, onCancel) => {
      setTimeout(() => resolve(value), 25);
      onCancel(handleCancel);
    });
    promise.cancel();
    await expect(promise).to.eventually.be.rejectedWith(AbortError);
    expect(handleCancel).to.have.been.called();
  });

  it(`should not call "onCancel" function when CancellablePromise is not cancelled`, async () => {
    const value = "Foo";
    const handleCancel = sinon.spy();
    const promise = new CancellablePromise((resolve, reject, onCancel) => {
      setTimeout(() => resolve(value), 25);
      onCancel(handleCancel);
    });
    await expect(promise).to.eventually.equal(value);
    expect(handleCancel).to.not.have.been.called();
  });

  it(`should not call "onCancel" function when CancellablePromise is rejected by something other than AbortError`, async () => {
    const reason = new Error("Bar");
    const handleCancel = sinon.spy();
    const promise = new CancellablePromise((resolve, reject, onCancel) => {
      setTimeout(() => reject(reason), 25);
      onCancel(handleCancel);
    });
    await expect(promise).to.eventually.be.rejectedWith(reason);
    expect(handleCancel).to.not.have.been.called();
  });

  it(`should ignore "resolve" when CancellablePromise is already settled`, async () => {
    const reason = new Error("Bar");
    const value = "Foo";
    const promise = new CancellablePromise((resolve, reject) => {
      setTimeout(() => resolve(value), 50);
      setTimeout(() => reject(reason), 25);
    });
    await Promise.all([
      expect(promise).to.eventually.be.rejectedWith(reason),
      new Promise((resolve) => setTimeout(resolve, 100)),
    ]);
  });

  it(`should ignore "reject" when CancellablePromise is already settled`, async () => {
    const reason = new Error("Bar");
    const value = "Foo";
    const promise = new CancellablePromise((resolve, reject) => {
      setTimeout(() => resolve(value), 25);
      setTimeout(() => reject(reason), 50);
    });
    await Promise.all([
      expect(promise).to.eventually.equal(value),
      new Promise((resolve) => setTimeout(resolve, 100)),
    ]);
  });

  it(`should ignore "cancel" method when CancellablePromise is already settled`, async () => {
    const value = "Foo";
    const promise = new CancellablePromise((resolve) =>
      setTimeout(() => resolve(value), 25)
    );
    await Promise.all([
      expect(promise).to.eventually.equal(value),
      new Promise((resolve) =>
        setTimeout(() => {
          promise.cancel();
          resolve();
        }, 50)
      ),
    ]);
  });
});
