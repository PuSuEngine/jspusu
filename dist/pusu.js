(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],2:[function(require,module,exports){
(function (process){
"use strict";
var tsd = require("./tsd");
/**
 * Should we show debug messages? (for development purposes only)
 * @type {boolean}
 */
var DEBUG = false;
if (DEBUG) {
    console.log("PuSu debug mode enabled.");
}
/**
 * PuSu Engine client
 */
var PuSu = (function () {
    /**
     * Create a new client instance
     * @param url PuSu Engine server address.
     */
    function PuSu(url) {
        /**
         * Timeout for connect, authorization, and subscribe. In milliseconds.
         * @type {number}
         */
        this.timeout = 5000;
        /**
         * When someone is waiting for events of a specific type
         */
        this._waiters = [];
        this._subscribers = {};
        this._server = url;
    }
    Object.defineProperty(PuSu, "TYPE_HELLO", {
        // The various message type strings
        get: function () {
            return "hello";
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(PuSu, "TYPE_AUTHORIZE", {
        get: function () {
            return "authorize";
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(PuSu, "TYPE_AUTHORIZATION_OK", {
        get: function () {
            return "authorization_ok";
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(PuSu, "TYPE_PUBLISH", {
        get: function () {
            return "publish";
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(PuSu, "TYPE_SUBSCRIBE", {
        get: function () {
            return "subscribe";
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(PuSu, "TYPE_SUBSCRIBE_OK", {
        get: function () {
            return "subscribe_ok";
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(PuSu, "TYPE_UNSUBSCRIBE", {
        get: function () {
            return "unsubscribe";
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(PuSu, "TYPE_UNKNOWN_MESSAGE_RECEIVED", {
        get: function () {
            return "unknown_message_received";
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(PuSu, "TYPE_AUTHORIZATION_FAILED", {
        get: function () {
            return "authorization_failed";
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(PuSu, "TYPE_PERMISSION_DENIED", {
        get: function () {
            return "permission_denied";
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Connect to the PuSu network
     * @returns {DeferredInterface<void>}
     */
    PuSu.prototype.connect = function (closeListener) {
        var deferred = tsd.create();
        if (this._socket) {
            this.disconnect();
        }
        if (DEBUG) {
            console.log("Connecting to " + this._server);
        }
        this._closeListener = closeListener;
        this._socket = new WebSocket(this._server);
        this._socket.onclose = this._onclose.bind(this);
        this._socket.onmessage = this._onmessage.bind(this);
        this._socket.onerror = this._onerror.bind(this);
        this._socket.onopen = this._onopen.bind(this);
        this._wait(PuSu.TYPE_HELLO, deferred);
        return deferred;
    };
    /**
     * Disconnect from the PuSu network
     */
    PuSu.prototype.disconnect = function () {
        if (this._socket) {
            this._socket.close();
        }
        this._socket = null;
    };
    /**
     * Authorize yourself.
     * @param authorization
     * @returns {DeferredInterface<void>}
     */
    PuSu.prototype.authorize = function (authorization) {
        var deferred = tsd.create();
        this._socket.send(JSON.stringify({
            type: PuSu.TYPE_AUTHORIZE,
            authorization: authorization
        }));
        this._wait(PuSu.TYPE_AUTHORIZATION_OK, deferred);
        return deferred;
    };
    /**
     * Subscribe to messages on a channel.
     * @param channel
     * @param listener
     * @returns {DeferredInterface<void>}
     */
    PuSu.prototype.subscribe = function (channel, listener) {
        var deferred = tsd.create();
        var exists = true;
        if (!this._subscribers[channel] || this._subscribers[channel].length === 0) {
            this._subscribers[channel] = [];
            exists = false;
        }
        this._subscribers[channel].push(listener);
        if (!exists) {
            this._socket.send(JSON.stringify({
                type: PuSu.TYPE_SUBSCRIBE,
                channel: channel
            }));
            this._wait(PuSu.TYPE_SUBSCRIBE_OK, deferred);
        }
        else {
            deferred.resolve();
        }
        return deferred;
    };
    /**
     * Unsubscribe from messages on a channel.
     * @param channel
     */
    PuSu.prototype.unsubscribe = function (channel) {
        var exists = false;
        if (this._subscribers[channel]) {
            exists = true;
            this._subscribers[channel] = [];
        }
        if (exists) {
            this._socket.send(JSON.stringify({
                type: PuSu.TYPE_UNSUBSCRIBE,
                channel: channel
            }));
        }
    };
    /**
     * Publish a message to a channel
     * @param channel
     * @param content
     */
    PuSu.prototype.publish = function (channel, content) {
        this._socket.send(JSON.stringify({
            type: PuSu.TYPE_PUBLISH,
            channel: channel,
            content: content
        }));
    };
    /**
     * Wait for an event of a specific type
     * @param eventType
     * @param deferred
     * @private
     */
    PuSu.prototype._wait = function (eventType, deferred) {
        var done = false;
        if (DEBUG) {
            console.log("Waiting for " + eventType);
        }
        var _this = this;
        var waiter = function waiter(type) {
            if (eventType == type) {
                var pos = _this._waiters.indexOf(waiter);
                if (pos === -1) {
                    // We're no longer supposed to wait for anything
                    return;
                }
                _this._waiters.splice(pos, 1);
                if (!done) {
                    done = true;
                    deferred.resolve();
                }
            }
        };
        this._waiters.push(waiter);
        setTimeout(function () {
            var pos = _this._waiters.indexOf(waiter);
            if (pos === -1) {
                // We're not supposed to wait for anything
                return;
            }
            _this._waiters.splice(pos, 1);
            if (!done) {
                done = true;
                console.log("Timeout exceeded waiting for " + eventType);
                deferred.reject();
            }
        }, this.timeout);
    };
    /**
     * When we receive a published message from the PuSu network.
     * @param message
     * @private
     */
    PuSu.prototype._onReceiveMessage = function (message) {
        if (this._subscribers[message.channel]) {
            this._subscribers[message.channel].forEach(function (f) {
                f(message.content);
            });
        }
    };
    /**
     * WebSocket close event handler
     * @param event
     * @private
     */
    PuSu.prototype._onclose = function (event) {
        if (DEBUG) {
            console.log("Connection to " + this._server + " closed.");
            console.error(event);
        }
        this._waiters = [];
        this._subscribers = {};
        if (this._closeListener) {
            this._closeListener(event);
        }
    };
    /**
     * WebSocket message event handler
     * @param event
     * @private
     */
    PuSu.prototype._onmessage = function (event) {
        var msg = JSON.parse(event.data);
        this._waiters.forEach(function (f) {
            f(msg.type);
        });
        if (msg.type === PuSu.TYPE_PUBLISH) {
            this._onReceiveMessage(msg);
        }
    };
    /**
     * WebSocket error event handler
     * @param event
     * @private
     */
    PuSu.prototype._onerror = function (event) {
        if (DEBUG) {
            console.log("Got an error from " + this._server + ".");
            console.error(event);
        }
    };
    /**
     * WebSocket open event handler
     * @param event
     * @private
     */
    PuSu.prototype._onopen = function (event) {
        if (DEBUG) {
            console.log("Connection to " + this._server + " established, waiting for \"Hello\".");
        }
    };
    return PuSu;
}());
exports.PuSu = PuSu;
function factory(exports) {
    exports.PuSu = PuSu;
}
if (typeof define !== "undefined" && define.amd) {
    // AMD require, register as an anonymous module
    if (DEBUG) {
        console.log("AMD loader detected");
    }
    define(['exports'], factory);
}
else if (typeof process !== "undefined" && process.browser) {
    if (DEBUG) {
        console.log("Looks like a browser");
    }
    // Browser
    factory(window);
}
else if (typeof module === 'object' && module.exports) {
    if (DEBUG) {
        console.log("Looks like CommonJS");
    }
    // CommonJS
    factory(module.exports);
}
else {
    if (DEBUG) {
        console.log("Looks like a browser");
    }
    // Browser
    factory(window);
}

}).call(this,require('_process'))
},{"./tsd":3,"_process":1}],3:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Christian Speckner
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 */
'use strict';
function create() {
    return new Deferred(DispatchDeferred);
}
exports.create = create;
function when(value) {
    if (value instanceof Promise) {
        return value;
    }
    return create().resolve(value).promise;
}
exports.when = when;
function DispatchDeferred(closure) {
    setTimeout(closure, 0);
}
var PromiseState;
(function (PromiseState) {
    PromiseState[PromiseState["Pending"] = 0] = "Pending";
    PromiseState[PromiseState["ResolutionInProgress"] = 1] = "ResolutionInProgress";
    PromiseState[PromiseState["Resolved"] = 2] = "Resolved";
    PromiseState[PromiseState["Rejected"] = 3] = "Rejected";
})(PromiseState || (PromiseState = {}));
var Client = (function () {
    function Client(_dispatcher, _successCB, _errorCB) {
        this._dispatcher = _dispatcher;
        this._successCB = _successCB;
        this._errorCB = _errorCB;
        this.result = new Deferred(_dispatcher);
    }
    Client.prototype.resolve = function (value, defer) {
        var _this = this;
        if (typeof (this._successCB) !== 'function') {
            this.result.resolve(value);
            return;
        }
        if (defer) {
            this._dispatcher(function () { return _this._dispatchCallback(_this._successCB, value); });
        }
        else {
            this._dispatchCallback(this._successCB, value);
        }
    };
    Client.prototype.reject = function (error, defer) {
        var _this = this;
        if (typeof (this._errorCB) !== 'function') {
            this.result.reject(error);
            return;
        }
        if (defer) {
            this._dispatcher(function () { return _this._dispatchCallback(_this._errorCB, error); });
        }
        else {
            this._dispatchCallback(this._errorCB, error);
        }
    };
    Client.prototype._dispatchCallback = function (callback, arg) {
        var result, then, type;
        try {
            result = callback(arg);
            this.result.resolve(result);
        }
        catch (err) {
            this.result.reject(err);
            return;
        }
    };
    return Client;
}());
var Deferred = (function () {
    function Deferred(_dispatcher) {
        this._dispatcher = _dispatcher;
        this._stack = [];
        this._state = PromiseState.Pending;
        this.promise = new Promise(this);
    }
    Deferred.prototype._then = function (successCB, errorCB) {
        if (typeof (successCB) !== 'function' && typeof (errorCB) !== 'function') {
            return this.promise;
        }
        var client = new Client(this._dispatcher, successCB, errorCB);
        switch (this._state) {
            case PromiseState.Pending:
            case PromiseState.ResolutionInProgress:
                this._stack.push(client);
                break;
            case PromiseState.Resolved:
                client.resolve(this._value, true);
                break;
            case PromiseState.Rejected:
                client.reject(this._error, true);
                break;
        }
        return client.result.promise;
    };
    Deferred.prototype.resolve = function (value) {
        if (this._state !== PromiseState.Pending) {
            return this;
        }
        return this._resolve(value);
    };
    Deferred.prototype._resolve = function (value) {
        var _this = this;
        var type = typeof (value), then, pending = true;
        try {
            if (value !== null &&
                (type === 'object' || type === 'function') &&
                typeof (then = value.then) === 'function') {
                if (value === this.promise) {
                    throw new TypeError('recursive resolution');
                }
                this._state = PromiseState.ResolutionInProgress;
                then.call(value, function (result) {
                    if (pending) {
                        pending = false;
                        _this._resolve(result);
                    }
                }, function (error) {
                    if (pending) {
                        pending = false;
                        _this._reject(error);
                    }
                });
            }
            else {
                this._state = PromiseState.ResolutionInProgress;
                this._dispatcher(function () {
                    _this._state = PromiseState.Resolved;
                    _this._value = value;
                    var i, stackSize = _this._stack.length;
                    for (i = 0; i < stackSize; i++) {
                        _this._stack[i].resolve(value, false);
                    }
                    _this._stack.splice(0, stackSize);
                });
            }
        }
        catch (err) {
            if (pending) {
                this._reject(err);
            }
        }
        return this;
    };
    Deferred.prototype.reject = function (error) {
        if (this._state !== PromiseState.Pending) {
            return this;
        }
        return this._reject(error);
    };
    Deferred.prototype._reject = function (error) {
        var _this = this;
        this._state = PromiseState.ResolutionInProgress;
        this._dispatcher(function () {
            _this._state = PromiseState.Rejected;
            _this._error = error;
            var stackSize = _this._stack.length, i = 0;
            for (i = 0; i < stackSize; i++) {
                _this._stack[i].reject(error, false);
            }
            _this._stack.splice(0, stackSize);
        });
        return this;
    };
    return Deferred;
}());
var Promise = (function () {
    function Promise(_deferred) {
        this._deferred = _deferred;
    }
    Promise.prototype.then = function (successCB, errorCB) {
        return this._deferred._then(successCB, errorCB);
    };
    Promise.prototype.otherwise = function (errorCB) {
        return this._deferred._then(undefined, errorCB);
    };
    Promise.prototype.always = function (errorCB) {
        return this._deferred._then(errorCB, errorCB);
    };
    return Promise;
}());

},{}]},{},[2]);
