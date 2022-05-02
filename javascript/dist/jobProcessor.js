"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fp_1 = __importDefault(require("lodash/fp"));
const nats_1 = require("nats");
const util_js_1 = require("./util.js");
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('nats');
const defaultBackoff = 1000;
const getNextBackoff = (backoff, msg) => {
    if (Array.isArray(backoff)) {
        return backoff[msg.info.redeliveryCount - 1] || backoff.at(-1);
    }
    return backoff;
};
const createStream = async (conn, def) => {
    const jsm = await conn.jetstreamManager();
    const defaultStreamConfig = {
        name: def.stream,
        retention: nats_1.RetentionPolicy.Workqueue,
        storage: nats_1.StorageType.File,
        max_age: (0, util_js_1.nanos)('1w'),
        // TODO: This should come from the def
        num_replicas: 1,
        subjects: [def.stream],
        discard: nats_1.DiscardPolicy.Old,
        deny_delete: false,
        deny_purge: false,
    };
    const config = fp_1.default.merge(defaultStreamConfig, def.streamConfig);
    debug('STREAM CONFIG %O', config);
    return jsm.streams.add(config);
};
const createConsumer = (conn, def) => {
    const defaultConsumerConfig = {
        durable_name: `${def.stream}Consumer`,
        max_deliver: def.numAttempts ?? 5,
        ack_policy: nats_1.AckPolicy.Explicit,
        ack_wait: (0, util_js_1.nanos)('10s'),
        deliver_policy: nats_1.DeliverPolicy.All,
        replay_policy: nats_1.ReplayPolicy.Instant,
    };
    const js = conn.jetstream();
    const config = fp_1.default.merge(defaultConsumerConfig, def.consumerConfig);
    debug('CONSUMER CONFIG %O', config);
    return js.pullSubscribe(def.filterSubject || '', {
        stream: def.stream,
        mack: true,
        config,
    });
};
const processFromDef = async (def) => {
    const conn = await (0, nats_1.connect)();
    // Create stream
    // TODO: Maybe handle errors better
    await createStream(conn, def).catch(() => { });
    // Create pull consumer
    const ps = await createConsumer(conn, def);
    const pullInterval = def.pullInterval ?? 1000;
    // Pull messages from the consumer
    const run = () => {
        ps.pull({ batch: def.batch ?? 10, expires: pullInterval });
    };
    const backoff = def.backoff ?? defaultBackoff;
    debug('BACKOFF', backoff);
    // Do the initial pull
    run();
    // Pull regularly
    setInterval(run, pullInterval);
    // Consume messages
    for await (let msg of ps) {
        debug('RECEIVED', new Date());
        try {
            await def.perform(msg, def);
            debug('COMPLETED', msg.info);
            // Ack message
            await msg.ackAck();
        }
        catch (e) {
            debug('FAILED', e);
            let backoffMs = getNextBackoff(backoff, msg);
            debug('NEXT BACKOFF MS', backoffMs);
            // Negative ack message with backoff
            msg.nak(backoffMs);
        }
    }
};
exports.default = processFromDef;
