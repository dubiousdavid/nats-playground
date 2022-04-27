import { AckPolicy, connect, DeliverPolicy, ReplayPolicy } from 'nats'
import ms from 'ms'

const nanos = (x) => ms(x) * 1000

const connection = await connect()
const js = connection.jetstream()
// Consumer config
const config = {
  description: 'Order processing',
  durable_name: 'PROCESS',
  ack_policy: AckPolicy.Explicit,
  deliver_policy: DeliverPolicy.All,
  replay_policy: ReplayPolicy.Instant,
  ack_wait: nanos('10s'),
  max_deliver: 5,
}
const ps = await js.pullSubscribe('', {
  stream: 'ORDERS',
  mack: true,
  config,
})

const fn = () => {
  console.log('[PULL]')
  ps.pull({ batch: 10, expires: 1000 })
}

// Do the initial pull
fn()
// Schedule a pull every so often
setInterval(fn, 1000)

let backoff = [1000, 2000, 3000, 4000, 5000]

for await (let msg of ps) {
  console.log('NOW', new Date())
  console.log('INFO', msg.info)
  console.log('DATA', msg.data.toString())
  let backoffMs = backoff[msg.info.redeliveryCount - 1]
  console.log('BACKOFF MS', backoffMs)
  // msg.nak(backoffMs)
  // msg.working()
  msg.ack()
}
