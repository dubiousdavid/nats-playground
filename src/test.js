import { setInterval } from 'timers/promises'

const interval = 100
for await (const startTime of setInterval(interval, Date.now())) {
  console.log(startTime)
  const now = Date.now()
  // console.log(now)
  if (now - startTime > 1000) break
}
console.log('Done')
