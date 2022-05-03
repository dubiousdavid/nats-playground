/*
 * Demonstrates how to schedule jobs where multiple schedulers
 * will be attempting to schedule the same thing at the same time.
 */
import { StringCodec } from 'nats'
import jobScheduler from '../src/jobScheduler'
const sc = StringCodec()

const run = async () => {
  const scheduler = await jobScheduler()
  scheduler.schedule({
    id: 'ordersEvery5s',
    rule: '*/5 * * * * *',
    subject: 'ORDERS.US',
    data: (date: Date) => sc.encode(`${date} : ${process.pid}`),
  })
}

run()
