import { JsMsg, StringCodec } from 'nats'
import Redis from 'ioredis'
import Redlock from 'redlock'
import { setTimeout } from 'node:timers/promises'
import ms from 'ms'
import jobProcessor from '../src/jobProcessor'

const sc = StringCodec()
const redis = new Redis()
const redlock = new Redlock([redis])

// TODO: This code needs rethinking
const def = {
  stream: 'ORDERS',
  numAttempts: 1,
  async perform(msg: JsMsg) {
    let resources = ['mySite:myJobLock']
    // Attempt to run some code
    await redlock.using(resources, ms('10s'), async (signal) => {
      const data = sc.decode(msg.data)
      for (let i = 0; i < 10; i++) {
        // Simulate some work
        await setTimeout(ms('5s'))
        console.log(i, data)
        // Make sure any attempted lock extension has not failed
        if (signal.aborted) {
          throw signal.error
        }
      }
    })
  },
}
const run = async () => {
  const processor = await jobProcessor()
  processor.start(def)
}

run()
