/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-7e5eb42b'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "pwa-maskable-512x512.png",
    "revision": "afaaa54a52b4621808095e50a1ce89c0"
  }, {
    "url": "pwa-512x512.png",
    "revision": "3cf6fced6160c7b1bc3195c7603366ee"
  }, {
    "url": "pwa-192x192.png",
    "revision": "98e772606baf2f19f0372c61522adeb8"
  }, {
    "url": "index.html",
    "revision": "e398393629254dcc0a224c02a95b9e2a"
  }, {
    "url": "icon.svg",
    "revision": "310f988d4aa6d998e1212a42459114b6"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "101ec32ab82a658613e9b66e061f9d12"
  }, {
    "url": "assets/workbox-window.prod.es5-BBnX5xw4.js",
    "revision": null
  }, {
    "url": "assets/index-DH5Uiz9I.js",
    "revision": null
  }, {
    "url": "assets/index-0P2eEDxn.css",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "101ec32ab82a658613e9b66e061f9d12"
  }, {
    "url": "icon.svg",
    "revision": "310f988d4aa6d998e1212a42459114b6"
  }, {
    "url": "pwa-192x192.png",
    "revision": "98e772606baf2f19f0372c61522adeb8"
  }, {
    "url": "pwa-512x512.png",
    "revision": "3cf6fced6160c7b1bc3195c7603366ee"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "afaaa54a52b4621808095e50a1ce89c0"
  }, {
    "url": "manifest.webmanifest",
    "revision": "b188088bf2586f67b219ee6417f1bb33"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));

}));
