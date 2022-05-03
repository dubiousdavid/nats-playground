import { connect } from 'nats'
import schedule from 'node-schedule'
import Redis from 'ioredis'
import ms from 'ms'
import _debug from 'debug'
import { JobSchedule, RedisOpts, NatsOpts } from './types'

const debug = _debug('nats')

const scheduleJob = async ({ natsOpts, redisOpts }: RedisOpts & NatsOpts) => {
  const connection = await connect(natsOpts)
  const js = connection.jetstream()
  const redis = new Redis(redisOpts)
  return ({ id, rule, subject, data }: JobSchedule) => {
    schedule.scheduleJob(rule, async (date) => {
      debug('SCHEDULING', date)
      const keyPrefix = 'schedulingLock'
      const scheduledTime = date.getTime().toString()
      const key = `${keyPrefix}:${id}:${scheduledTime}`
      const lockObtained = await redis.set(
        key,
        process.pid,
        'PX',
        ms('1m'),
        'NX'
      )
      if (lockObtained) {
        js.publish(subject, data)
      }
    })
  }
}

export default scheduleJob
