import { connect } from 'nats'
import schedule from 'node-schedule'
import Redis from 'ioredis'
import ms from 'ms'
import _debug from 'debug'
import { JobSchedule } from './types'

const debug = _debug('nats')

const scheduleJob = async ({ id, rule, subject, data }: JobSchedule) => {
  const connection = await connect()
  const js = connection.jetstream()
  // TODO: Set key prefix per environment
  const redis = new Redis()
  schedule.scheduleJob(rule, async (date) => {
    debug('SCHEDULING', date)
    const keyPrefix = 'schedulingLock'
    const scheduledTime = date.getTime().toString()
    const key = `${keyPrefix}:${id}:${scheduledTime}`
    const lockObtained = await redis.set(key, process.pid, 'PX', ms('1m'), 'NX')
    if (lockObtained) {
      js.publish(subject, data)
    }
  })
}

export default scheduleJob
