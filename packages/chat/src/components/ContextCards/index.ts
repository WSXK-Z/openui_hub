import { withInstall } from '@dp_ui/core'
import _DpcContextCards from './DpcContextCards.vue'

export const DpcContextCards = withInstall(_DpcContextCards)

export default { DpcContextCards }
export type {
  DpcContextCardsComp,
  DpcContextCardsLabels,
  DpcContextCardsProps,
  DpcContextChunk,
} from './DpcContextCards.vue'
