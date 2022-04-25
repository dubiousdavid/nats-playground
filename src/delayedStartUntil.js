import ms from 'ms'
import processFromDef from './jobProcessor.js'
import { expBackoff, delayProcessingUntil } from './util.js'

const def = {
  stream: 'ORDERS',
  backoff: expBackoff(ms('1s')),
  async perform(msg) {
    await delayProcessingUntil(msg)
    console.log('DONE')
  },
}

await processFromDef(def)
