import ms from 'ms'
import processFromDef from '../jobProcessor.js'
import { expBackoff, delayInitialProcessing } from '../util.js'

const def = {
  stream: 'ORDERS',
  backoff: expBackoff(ms('1s')),
  async perform(msg) {
    // Delay is greater than 10s ack wait timeout
    const delay = ms('15s')
    await delayInitialProcessing(delay, msg)
    console.log('DONE')
  },
}
await processFromDef(def)
