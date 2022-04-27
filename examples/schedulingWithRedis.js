import { StringCodec } from 'nats'
import scheduleJob from '../jobScheduler.js'
const sc = StringCodec()

scheduleJob({
  id: 'ordersEvery5s',
  rule: '*/5 * * * * *',
  subject: 'ORDERS.job',
  data: sc.encode(process.pid.toString()),
})
