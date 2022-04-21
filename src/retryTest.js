import processFromDef from './jobProcessor.js'

const def = {
  stream: 'ORDERS',
  backoff: [1000, 2000, 4000, 8000],
  perform(msg) {
    console.log(msg.info)
    throw 'fail'
  }
}
await processFromDef(def)
