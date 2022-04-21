import { connect, StringCodec } from 'nats'
import schedule from 'node-schedule'
import Redis from 'ioredis'
import ms from 'ms'

const connection = await connect()
const js = connection.jetstream()
const sc = StringCodec()
const redis = new Redis()
let counter = 1

schedule.scheduleJob('*/5 * * * * *', async (date) => {
  console.log(`(${counter++}) Scheduling ${date}`)
  const keyPrefix = 'schedulingLock:'
  const scheduledTime = date.getTime().toString()
  const key = `${keyPrefix}${scheduledTime}`
  const lockObtained = await redis.set(key, process.pid, 'PX', ms('1m'), 'NX')
  if (lockObtained) {
    console.log(`Published ${date}`)
    js.publish('ORDERS.job', sc.encode(`${date} ${process.pid}`))
  }
})
