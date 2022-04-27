import { StringCodec } from 'nats'
import Redis from 'ioredis'
import Redlock from 'redlock'
import { setTimeout } from 'node:timers/promises'
import ms from 'ms'
import processFromDef from '../jobProcessor.js'

const sc = StringCodec()
const redis = new Redis()
const redlock = new Redlock([redis])

const def = {
  stream: 'syncWithDataSource',
  numAttempts: 1,
  async perform(msg) {
    let resources = ['govSpend:myJobLock']
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
await processFromDef(def)
