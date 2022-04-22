import { connect, StringCodec } from 'nats'
import schedule from 'node-schedule'

const connection = await connect()
const js = connection.jetstream()
const sc = StringCodec()
let counter = 1

schedule.scheduleJob('*/5 * * * * *', (date) => {
  console.log(`(${counter++}) Scheduling ${date}`)
  const msgID = date.getTime().toString()
  js.publish('ORDERS.job', sc.encode(`${date} ${process.pid}`), { msgID })
})