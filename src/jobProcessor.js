import _ from 'lodash/fp.js'
import { AckPolicy, connect, DeliverPolicy, ReplayPolicy } from 'nats'
import ms from 'ms'
import _debug from 'debug'

const debug = _debug('nats')
const nanos = (x) => ms(x) * 1000

const defaultBackoff = 1000

const getNextBackoff = (backoff, msg) => {
  if (Array.isArray(backoff)) {
    return backoff[msg.info.redeliveryCount - 1] || backoff.at(-1)
  }
  return backoff
}

const processFromDef = async (def) => {
  const defaultConsumerConfig = {
    durable_name: 'PROCESS',
    max_deliver: def.numAttempts ?? 5,
    ack_policy: AckPolicy.Explicit,
    ack_wait: nanos('10s'),
    deliver_policy: DeliverPolicy.All,
    replay_policy: ReplayPolicy.Instant,
  }

  const conn = await connect()
  const js = conn.jetstream()
  const config = _.defaults(def.consumer, defaultConsumerConfig)
  const ps = await js.pullSubscribe('', {
    stream: def.stream,
    mack: true,
    config,
  })
  const pullInterval = def.pullInterval ?? 1000
  const run = () => {
    ps.pull({ batch: def.batch ?? 10, expires: pullInterval })
  }
  const backoff = def.backoff ?? defaultBackoff
  // Do the initial pull
  run()
  // Pull regularly
  setInterval(run, pullInterval)

  for await (let msg of ps) {
    debug('RECEIVED', new Date())
    try {
      await def.perform(msg, def)
      debug('COMPLETED', msg)
      // Ack message
      msg.ack()
    } catch (e) {
      debug('FAILED', e)
      let backoffMs = getNextBackoff(backoff, msg)
      debug('BACKOFF MS', backoffMs)
      // Negative ack message with backoff
      msg.nak(backoffMs)
    }
  }
}

export default processFromDef
