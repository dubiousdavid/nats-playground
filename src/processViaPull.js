import {
  NatsError,
  AckPolicy,
  connect,
  DeliverPolicy,
  ReplayPolicy,
} from 'nats'
import ms from 'ms'
import { setTimeout } from 'node:timers/promises'

const connection = await connect()

const nanos = (x) => ms(x) * 1000

const js = connection.jetstream()
const jsm = await connection.jetstreamManager()
// Create the consumer
await jsm.consumers.add('ORDERS', {
  description: 'Order processing',
  durable_name: 'PROCESS',
  ack_policy: AckPolicy.Explicit,
  deliver_policy: DeliverPolicy.All,
  replay_policy: ReplayPolicy.Instant,
  ack_wait: nanos('10s'),
  max_deliver: 5,
})

let backoff = [1000, 2000, 3000, 4000]

/* eslint-disable-next-line */
while (true) {
  try {
    let msg = await js.pull('ORDERS', 'PROCESS')
    console.log('RECEIVED', new Date())
    console.log('INFO', msg.info)
    console.log('DATA', msg.data.toString())
    let backoffMs = backoff[msg.info.redeliveryCount - 1]
    console.log('BACKOFF MS', backoffMs)
    msg.nak(backoffMs)
    // msg.working()
    // msg.ack()
  } catch (e) {
    if (
      e instanceof NatsError &&
      (e.code === 'TIMEOUT' || e.code === '404 No Messages')
    ) {
      await setTimeout(1000)
    } else {
      throw e
    }
  }
}
