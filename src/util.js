import { setInterval } from 'node:timers/promises'
import ms from 'ms'
import _debug from 'debug'

const debug = _debug('nats')

export let nanos = (x) => ms(x) * 1e6

export let delayInitialProcessing = async (delayMs, msg) => {
  if (msg.info.redeliveryCount === 1) {
    debug('DELAYING', delayMs)
    // Indicate we are working every second to prevent an ack wait timeout
    for await (const startTime of setInterval(ms('1s'), Date.now())) {
      if (Date.now() - startTime >= delayMs) {
        break
      }
      msg.working()
    }
    debug('DELAY COMPLETE')
  }
}

export let expBackoff = (startMs, { repeatAfter = 5, numEntries = 5 }) => {
  let vals = []
  let val = startMs
  for (let i = 0; i < numEntries; i++) {
    vals.push(val)
    val = i === repeatAfter ? val : val * 2
  }
  return vals
}
