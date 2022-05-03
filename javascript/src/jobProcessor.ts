import _ from 'lodash/fp'
import {
  AckPolicy,
  connect,
  DeliverPolicy,
  DiscardPolicy,
  JsMsg,
  NatsConnection,
  ReplayPolicy,
  RetentionPolicy,
  StorageType,
  StreamInfo,
} from 'nats'
import { nanos, defer } from './util'
import _debug from 'debug'
import { Deferred, NatsOpts, JobDef } from './types'
import { clearInterval } from 'timers'

const debug = _debug('nats')

const defaultBackoff = 1000

const getNextBackoff = (backoff: number | number[], msg: JsMsg) => {
  if (Array.isArray(backoff)) {
    return backoff[msg.info.redeliveryCount - 1] || backoff.at(-1)
  }
  return backoff
}

const createStream = async (conn: NatsConnection, def: JobDef) => {
  const jsm = await conn.jetstreamManager()
  const defaultStreamConfig = {
    name: def.stream,
    retention: RetentionPolicy.Workqueue,
    storage: StorageType.File,
    max_age: nanos('1w'),
    // TODO: This should come from the def
    num_replicas: 1,
    subjects: [def.stream],
    discard: DiscardPolicy.Old,
    deny_delete: false,
    deny_purge: false,
  }
  const config = _.merge(defaultStreamConfig, def.streamConfig)
  debug('STREAM CONFIG %O', config)
  return jsm.streams.add(config)
}

const createConsumer = (conn: NatsConnection, def: JobDef) => {
  const defaultConsumerConfig = {
    durable_name: `${def.stream}Consumer`,
    max_deliver: def.numAttempts ?? 5,
    ack_policy: AckPolicy.Explicit,
    ack_wait: nanos('10s'),
    deliver_policy: DeliverPolicy.All,
    replay_policy: ReplayPolicy.Instant,
  }
  const js = conn.jetstream()
  const config = _.merge(defaultConsumerConfig, def.consumerConfig)
  debug('CONSUMER CONFIG %O', config)

  return js.pullSubscribe(def.filterSubject || '', {
    stream: def.stream,
    mack: true,
    config,
  })
}

const jobProcessor = async (opts?: NatsOpts) => {
  const { natsOpts } = opts || {}
  const conn = await connect(natsOpts)
  let timer: NodeJS.Timer
  let deferred: Deferred<void>
  let abortController = new AbortController()

  const start = async (def: JobDef) => {
    // Create stream
    // TODO: Maybe handle errors better
    await createStream(conn, def).catch(() => {})
    // Create pull consumer
    const ps = await createConsumer(conn, def)
    const pullInterval = def.pullInterval ?? 1000
    // Pull messages from the consumer
    const run = () => {
      ps.pull({ batch: def.batch ?? 10, expires: pullInterval })
    }
    const backoff = def.backoff ?? defaultBackoff
    debug('BACKOFF', backoff)
    // Do the initial pull
    run()
    // Pull regularly
    timer = setInterval(run, pullInterval)
    // Consume messages
    for await (let msg of ps) {
      debug('RECEIVED', new Date())
      deferred = defer()
      try {
        await def.perform(msg, abortController.signal, def)
        debug('COMPLETED', msg.info)
        // Ack message
        await msg.ackAck()
      } catch (e) {
        debug('FAILED', e)
        let backoffMs = getNextBackoff(backoff, msg)
        debug('NEXT BACKOFF MS', backoffMs)
        // Negative ack message with backoff
        msg.nak(backoffMs)
      } finally {
        deferred.done()
      }
      // Don't process any more messages if stopping
      if (abortController.signal.aborted) {
        return
      }
    }
  }
  const stop = () => {
    abortController.abort()
    clearInterval(timer)
    return deferred?.promise
  }
  return { start, stop }
}

export default jobProcessor
