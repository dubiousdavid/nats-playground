import { setInterval, setTimeout } from 'node:timers/promises'
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

// send a message header with name "startTime" where the header value converts to a Date (future, if there is to be a delay)
// CLI Example: nats pub --context local ORDERS "Test" -H startTime:2022-04-25T14:58:26.690Z
export let delayProcessingUntil = async msg => {
  let val = msg.headers?.get('startTime')

  if (val) {
    let startTime = new Date(val)
    if (msg.info.redeliveryCount === 1) {
      debug('DELAYING UNTIL', startTime)

      // Indicate we are working every second to prevent an ack wait timeout
      let elapsed = false
      while (!elapsed) {
        console.log('now', Date.now())
        console.log('startTime', startTime)
        if (Date.now() > startTime) {
          elapsed = true
        } else {
          await setTimeout(ms('1s'))
          msg.working()
        }
      }
      debug('DELAY UNTIL COMPLETE')
    }
  }
}

export let expBackoff = (startMs, { repeatAfter = 5, numEntries = 5 } = {}) => {
  let vals = []
  let val = startMs
  for (let i = 0; i < numEntries; i++) {
    vals.push(val)
    val = i === repeatAfter ? val : val * 2
  }
  return vals
}
