import {create, DeferredInterface} from "./tsd";

/**
 * Should we show debug messages? (for development purposes only)
 * @type {boolean}
 */
const DEBUG = false;

if (DEBUG) {
    console.log("PuSu debug mode enabled.");
}

export interface Message {
    type: string;
    channel: string;
    content: any;
}

interface Subscriber {
    (msg: Message): void;
}

/**
 * PuSu Engine client
 */
export class PuSu {
    // The various message type strings
    public static get TYPE_HELLO(): string {
        return "hello";
    }

    public static get TYPE_AUTHORIZE(): string {
        return "authorize";
    }

    public static get TYPE_AUTHORIZATION_OK(): string {
        return "authorization_ok";
    }

    public static get TYPE_PUBLISH(): string {
        return "publish";
    }

    public static get TYPE_SUBSCRIBE(): string {
        return "subscribe";
    }

    public static get TYPE_SUBSCRIBE_OK(): string {
        return "subscribe_ok";
    }

    public static get TYPE_UNKNOWN_MESSAGE_RECEIVED(): string {
        return "unknown_message_received";
    }

    public static get TYPE_AUTHORIZATION_FAILED(): string {
        return "authorization_failed";
    }

    public static get TYPE_PERMISSION_DENIED(): string {
        return "permission_denied";
    }

    /**
     * Timeout for connect, authorization, and subscribe. In milliseconds.
     * @type {number}
     */
    public timeout: number = 5000;

    /**
     * The URL of the PuSu Engine server we're supposed to connect to
     */
    private _server: string;

    /**
     * The WebSocket connected to the server
     */
    private _socket: WebSocket;

    /**
     * When someone is waiting for events of a specific type
     */
    private _waiter: (type: string) => void;

    private _subscribers: {[channel: string]: Subscriber} = {};

    /**
     * Create a new client instance
     * @param url PuSu Engine server address.
     */
    constructor(url: string) {
        this._server = url;
    }

    /**
     * Connect to the PuSu network
     * @returns {DeferredInterface<void>}
     */
    connect(): DeferredInterface<void> {
        let deferred = create<void>();

        if (this._socket) {
            this.disconnect();
        }

        if (DEBUG) {
            console.log(`Connecting to ${this._server}`);
        }

        this._socket = new WebSocket(this._server);
        this._socket.onclose = this._onclose.bind(this);
        this._socket.onmessage = this._onmessage.bind(this);
        this._socket.onerror = this._onerror.bind(this);
        this._socket.onopen = this._onopen.bind(this);

        this._wait(PuSu.TYPE_HELLO, deferred);

        return deferred;
    }

    /**
     * Disconnect from the PuSu network
     */
    disconnect() {
        if (this._socket) {
            this._socket.close()
        }

        this._socket = null;
    }

    /**
     * Authorize yourself.
     * @param authorization
     * @returns {DeferredInterface<void>}
     */
    authorize(authorization: string): DeferredInterface<void> {
        let deferred = create<void>();

        this._socket.send(JSON.stringify({
            type: PuSu.TYPE_AUTHORIZE,
            authorization: authorization
        }));

        this._wait(PuSu.TYPE_AUTHORIZATION_OK, deferred);

        return deferred
    }

    /**
     * Subscribe to messages on a channel.
     * @param channel
     * @param listener
     * @returns {DeferredInterface<void>}
     */
    subscribe(channel: string, listener: Subscriber): DeferredInterface<void> {
        let deferred = create<void>();

        this._subscribers[channel] = listener;
        this._socket.send(JSON.stringify({
            type: PuSu.TYPE_SUBSCRIBE,
            channel: channel
        }));
        this._wait(PuSu.TYPE_SUBSCRIBE_OK, deferred);

        return deferred;
    }

    /**
     * Publish a message to a channel
     * @param channel
     * @param content
     */
    publish(channel: string, content: any): void {
        this._socket.send(JSON.stringify({
            type: PuSu.TYPE_PUBLISH,
            channel: channel,
            content: content
        }));
    }

    /**
     * Wait for an event of a specific type
     * @param eventType
     * @param deferred
     * @private
     */
    private _wait(eventType: string, deferred: DeferredInterface<void>) {
        let ok = false;

        if (DEBUG) {
            console.log(`Waiting for ${eventType}`);
        }

        this._waiter = function (type: string) {
            if (eventType == type) {
                console.log(`Got ${eventType}`);
                ok = true;
                deferred.resolve()
            }
        };

        setTimeout(function () {
            if (!ok) {
                console.log(`Timeout exceeded waiting for ${eventType}`);
                deferred.reject();
            }
        }, this.timeout);
    }

    /**
     * When we receive a published message from the PuSu network.
     * @param message
     * @private
     */
    private _onReceiveMessage(message: Message) {
        if (this._subscribers[message.channel]) {
            this._subscribers[message.channel](message.content);
        }
    }

    /**
     * WebSocket close event handler
     * @param event
     * @private
     */
    private _onclose(event: Event) {
        if (DEBUG) {
            console.log(`Connection to ${this._server} closed.`);
            console.error(event);
        }
    }

    /**
     * WebSocket message event handler
     * @param event
     * @private
     */
    private _onmessage(event: MessageEvent) {
        let msg = JSON.parse(event.data);
        if (this._waiter) {
            this._waiter(msg.type);
        }
        if (msg.type === PuSu.TYPE_PUBLISH) {
            this._onReceiveMessage(msg);
        }
    }

    /**
     * WebSocket error event handler
     * @param event
     * @private
     */
    private _onerror(event: Event) {
        if (DEBUG) {
            console.log(`Got an error from ${this._server}.`);
            console.error(event);
        }
    }

    /**
     * WebSocket open event handler
     * @param event
     * @private
     */
    private _onopen(event: Event) {
        if (DEBUG) {
            console.log(`Connection to ${this._server} established, waiting for "Hello".`);
        }
    }
}

declare var define: any;
declare var module: any;
declare var exports: any;
declare var process: any;

function factory(exports: any) {
    exports.PuSu = PuSu;
}

if (typeof define !== "undefined" && define.amd) {
    // AMD require, register as an anonymous module
    if (DEBUG) {
        console.log("AMD loader detected");
    }
    define(['exports'], function () {
        return PuSu
    });
} else if (typeof process !== "undefined" && process.browser) {
    if (DEBUG) {
        console.log("Looks like a browser");
    }
    // Browser
    factory(window);
} else if (typeof module === 'object' && module.exports) {
    if (DEBUG) {
        console.log("Looks like CommonJS");
    }
    // CommonJS
    factory(module.exports);
} else {
    if (DEBUG) {
        console.log("Looks like a browser");
    }
    // Browser
    factory(window);
}
