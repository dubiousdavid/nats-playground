import ms from 'ms'
import processFromDef from './jobProcessor.js'
import { expBackoff } from './util.js'

const def = {
  // Stream
  stream: 'ORDERS',
  streamConfig: {
    subjects: ['ORDERS.*']
  },
  // Consumer
  filterSubject: 'ORDERS.US',
  consumerConfig: {
    durable_name: 'usOrders',
  },
  // Retry delays
  backoff: expBackoff(ms('1s')),
  // Process message
  async perform(msg) {
    console.log(msg.info)
    throw 'fail'
  },
}
await processFromDef(def)
