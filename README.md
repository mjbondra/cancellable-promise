# CancellablePromise

[![coverage report](https://gitlab.com/wondermonger/cancellable-promise/badges/master/coverage.svg)](https://wondermonger.gitlab.io/cancellable-promise/coverage/index.html)

An extension of the Promise class that allows for cancellation.  

## Installation

```shell
npm i @wondermonger/cancellable-promise
```

## Usage

### Prerequisites

- [node@>=10.0.0](https://nodejs.org)

### API

#### `new CancellablePromise(executor, [signal])`

- **executor** {*Function*} executor function (*required*)
  - **resolve** {*Function*} function that fulfills a `CancellablePromise` with a given value (*required*)
  - [**reject**] {*Function*} function that rejects a `CancellablePromise` with a given reason
  - [**onCancel**] {*Function*} function for handling cancellation within the **excecutor** function -- the `AbortError` must still be handled outside of the **excecutor** function
- [**signal**] {*[AbortSignal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal)*} [AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController) signal property
- **returns** {*CancellablePromise*} a CancellablePromise instance

#### `CancellablePromise.prototype.cancel([message])`

- [**message**] {*String*} `AbortError` instance message

#### `CancellablePromise.prototype.catchCancel(onCancellation)`

- **onCancellation** {*Function*} cancellation error handling function -- if cancellations are not handled by `CancellablePromise.prototype.catchCancel` they must be handled by `CancellablePromise.prototype.catch` or they will result in an uncaught `AbortError` (*required*)

#### `CancellablePromise extends Promise`

- see [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) documentation for more information

### Code Examples

```javascript
'use strict';

const CancellablePromise = require("@wondermonger/cancellable-promise");

const promise = new CancellablePromise((resolve, reject, onCancel) => {
  const timeout = setTimeout(() => {
    console.info("timeout complete")
    resolve(new Error("rejected"))
  }, 5000);
  onCancel(() => {
    clearTimeout(timeout);
    console.info("timeout cleared")
  });
});

setTimeout(() => promise.cancel(), 2500);

promise
  .then(value => console.info("never called"))
  .catchCancel((abortError) => console.warn("cancellation caught here"))
  .catch(error => console.error("never called"));

promise
  .then(value => console.info("never called"))
  .catch(error => console.error("cancellation caught here when .catchCancel() not called earlier in chain"));

promise
  .then(value => console.info("never called"))
  .catch(error => console.error("cancellation caught here when .catchCancel() not called earlier in chain"))
  .catchCancel((abortError) => console.warn("never called because cancellation was already caught by .catch()"));

promise
  .then(value => console.info("never called and AbortError is unhandled"));

```

**Using [AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)**

```javascript
'use strict';

const AbortController = require("abort-controller");
const CancellablePromise = require("@wondermonger/cancellable-promise");

const controller = new AbortController();
const promise = new CancellablePromise((resolve, reject, onCancel) => {
  const timeout = setTimeout(() => {
    console.info("timeout complete");
    resolve("Foo");
  }, 5000);
  onCancel(() => {
    clearTimeout(timeout);
    console.info("timeout cleared")
  });
}, controller.signal);

setTimeout(() => controller.abort(), 2500);

promise
  .then(value => console.info("never called"))
  .catchCancel((abortError) => console.warn("cancellation caught here"))
  .catch(error => console.error("never called"));

```

**Async Functions**

```javascript
'use strict';

const CancellablePromise = require("@wondermonger/cancellable-promise");

const promise = new CancellablePromise((resolve, reject, onCancel) => {
  const timeout = setTimeout(() => {
    console.info("timeout complete");
    resolve("Foo");
  }, 5000);
  onCancel(() => {
    clearTimeout(timeout);
    console.info("timeout cleared")
  });
});

setTimeout(() => promise.cancel(), 2500);

const someAsyncFunction = async () => {
  try {
    const value = await promise;
    console.info("never called");
    return value;
  } catch (err) {
    if (err && err.name === "AbortError") {
      console.warn("cancellation caught here"));
      return "Bar";
    }
    console.error("never called");
  }
};

const anotherAsyncFunction = async () => {
  try {
    const value = await promise.catchCancel((abortError) => {
      console.warn("cancellation caught here");
      return "Bar";
    });
    console.info("resolved value is `Bar`");
    return value;
  } catch (err) {
    console.error("never called");
  }
};

```

**Using [AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController) with Promise**

It requires some additional effort, but you can use an `AbortController` with an unextended `Promise`. You may not need this library.

## Development

Merge requests should be submitted to [https://gitlab.com/wondermonger/cancellable-promise](https://gitlab.com/wondermonger/cancellable-promise).

### Installation

```shell
npm i
```

### Linting

```shell
npm run lint
```

### Testing

```shell
# all tests
npm run test

# unit tests
npm run test:unit

# coverage tests
npm run test:coverage
```

## License

The MIT License (MIT)

Copyright (c) 2020 Michael J. Bondra <mjbondra@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
