import processFromDef from './jobProcessor.js'

const def = {
  stream: 'ORDERS',
  backoff: [1000, 2000, 4000, 8000],
  perform() {
    console.log('DONE')
  }
}
await processFromDef(def)
