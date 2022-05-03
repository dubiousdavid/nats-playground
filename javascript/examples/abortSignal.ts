import { JsMsg } from 'nats'
import { setTimeout } from 'node:timers/promises'
import jobProcessor from '../src/jobProcessor'

const def = {
  stream: 'ORDERS',
  backoff: [1000, 2000, 4000, 8000],
  async perform(msg: JsMsg, signal: AbortSignal) {
    console.log(`Started ${msg.info.streamSequence}`)
    for (let i = 0; i < 5; i++) {
      await setTimeout(1000)
      if (signal.aborted) {
        return
      }
    }
    console.log(`Completed ${msg.info.streamSequence}`)
  },
}
const run = async () => {
  const processor = await jobProcessor()
  // Gracefully handle signals
  const shutDown = async () => {
    await processor.stop()
    process.exit(0)
  }
  process.on('SIGTERM', shutDown)
  process.on('SIGINT', shutDown)
  // Start processing messages
  processor.start(def)
}

run()
