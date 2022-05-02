"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const nats_1 = require("nats");
const node_schedule_1 = __importDefault(require("node-schedule"));
const ioredis_1 = __importDefault(require("ioredis"));
const ms_1 = __importDefault(require("ms"));
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('nats');
const scheduleJob = async ({ id, rule, subject, data }) => {
    const connection = await (0, nats_1.connect)();
    const js = connection.jetstream();
    // TODO: Set key prefix per environment
    const redis = new ioredis_1.default();
    node_schedule_1.default.scheduleJob(rule, async (date) => {
        debug('SCHEDULING', date);
        const keyPrefix = 'schedulingLock';
        const scheduledTime = date.getTime().toString();
        const key = `${keyPrefix}:${id}:${scheduledTime}`;
        const lockObtained = await redis.set(key, process.pid, 'PX', (0, ms_1.default)('1m'), 'NX');
        if (lockObtained) {
            js.publish(subject, data);
        }
    });
};
exports.default = scheduleJob;
