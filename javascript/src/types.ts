import { ConsumerOpts, JsMsg, StreamConfig } from 'nats'
import {
  RecurrenceRule,
  RecurrenceSpecDateRange,
  RecurrenceSpecObjLit,
} from 'node-schedule'

export interface JobDef {
  stream: string
  streamConfig: StreamConfig
  consumerConfig: ConsumerOpts
  filterSubject: string
  pullInterval?: number
  batch?: number
  backoff?: number | number[]
  numAttempts?: number
  perform(msg: JsMsg, def: JobDef): Promise<void>
}

export interface JobSchedule {
  id: string
  rule:
    | RecurrenceRule
    | RecurrenceSpecDateRange
    | RecurrenceSpecObjLit
    | Date
    | string
    | number
  subject: string
  data: Uint8Array
}
