"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.expBackoff = exports.delayInitialProcessing = exports.nanos = void 0;
const promises_1 = require("node:timers/promises");
const ms_1 = __importDefault(require("ms"));
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('nats');
let nanos = (x) => (0, ms_1.default)(x) * 1e6;
exports.nanos = nanos;
let delayInitialProcessing = async (delayMs, msg) => {
    if (msg.info.redeliveryCount === 1) {
        debug('DELAYING', delayMs);
        // Indicate we are working every second to prevent an ack wait timeout
        for await (const startTime of (0, promises_1.setInterval)((0, ms_1.default)('1s'), Date.now())) {
            if (Date.now() - startTime >= delayMs) {
                break;
            }
            msg.working();
        }
        debug('DELAY COMPLETE');
    }
};
exports.delayInitialProcessing = delayInitialProcessing;
let expBackoff = (startMs, { repeatAfter = 5, numEntries = 5 } = {}) => {
    let vals = [];
    let val = startMs;
    for (let i = 0; i < numEntries; i++) {
        vals.push(val);
        val = i === repeatAfter ? val : val * 2;
    }
    return vals;
};
exports.expBackoff = expBackoff;
