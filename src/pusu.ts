import {create, DeferredInterface} from "./tsd";

/**
 * Should we show debug messages? (for development purposes only)
 * @type {boolean}
 */
const DEBUG = false;

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
    private _waiter: (string) => void;

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

        this._socket = new WebSocket(this._server);
        this._socket.onclose = this._onclose.bind(this);
        this._socket.onmessage = this._onmessage.bind(this);
        this._socket.onerror = this._onerror.bind(this);
        this._socket.onopen = this._onopen.bind(this);

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
     * @returns {DeferredInterface<void>}
     */
    subscribe(channel: string): DeferredInterface<void> {
        let deferred = create<void>();

        return deferred;
    }

    /**
     * Wait for an event of a specific type
     * @param eventType
     * @param deferred
     * @private
     */
    private _wait(eventType: string, deferred: DeferredInterface<void>) {
        let ok = false;
        this._waiter = function(type: string) {
            if (eventType == type) {
                ok = true;
                deferred.resolve()
            }
        };

        setTimeout(function() {
            if (!ok) {
                deferred.reject();
            }
        }, this.timeout);
    }

    private _onclose(event: Event) {
        console.log("close", event);
    }

    private _onmessage(event: Event) {
        console.log("message", event);
    }

    private _onerror(event: Event) {
        console.log("error", event);
    }

    private _onopen(event: Event) {
        console.log("open", event);
    }


}
