import { connect } from 'nats'
import nodeSchedule from 'node-schedule'
import Redis from 'ioredis'
import ms from 'ms'
import _debug from 'debug'
import { JobSchedule, RedisOpts, NatsOpts } from './types'

const debug = _debug('nats')

const jobScheduler = async (opts?: RedisOpts & NatsOpts) => {
  const { natsOpts, redisOpts } = opts || {}
  const connection = await connect(natsOpts)
  const js = connection.jetstream()
  const redis = redisOpts ? new Redis(redisOpts) : new Redis()
  const schedule = ({ id, rule, subject, data }: JobSchedule) => {
    const isFunction = typeof data === 'function'
    return nodeSchedule.scheduleJob(rule, async (date) => {
      const keyPrefix = 'schedulingLock'
      const scheduledTime = date.getTime()
      const key = `${keyPrefix}:${id}:${scheduledTime}`
      // Attempt to get an exclusive lock
      const lockObtained = await redis.set(
        key,
        process.pid,
        'PX',
        ms('1m'),
        'NX'
      )
      if (lockObtained) {
        debug('SCHEDULED', date)
        js.publish(subject, isFunction ? data(date) : data)
      }
    })
  }

  return { schedule }
}

export default jobScheduler
