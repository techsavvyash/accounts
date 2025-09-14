export { AnalyticsTracker } from './tracker'
export * from './types'

import { AnalyticsTracker } from './tracker'

export const createAnalyticsTracker = (config: {
  apiKey?: string
  host?: string
  enabled?: boolean
  debug?: boolean
}) => {
  return new AnalyticsTracker(config)
}

export default AnalyticsTracker