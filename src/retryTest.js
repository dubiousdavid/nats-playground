import ms from 'ms'
import processFromDef from './jobProcessor.js'
import { expBackoff } from './util.js'

const def = {
  stream: 'ORDERS',
  backoff: expBackoff(ms('1s')),
  perform(msg) {
    console.log(msg.info)
    throw 'fail'
  },
}
await processFromDef(def)
