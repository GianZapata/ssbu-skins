<script setup lang="ts">
import { ProposalState } from '../enums/ProposalState'
import type { CostumeLayer } from '../../../shared/enums/CostumeLayer'

interface MeterCostume {
  n: number
  layer: CostumeLayer
  proposal: ProposalState
}

interface CostumeMeterProps {
  costumes: MeterCostume[]
  label: string
}

const props = defineProps<CostumeMeterProps>()
</script>

<template>
  <span class="meter" role="img" :aria-label="props.label">
    <i
      v-for="costume in props.costumes"
      :key="costume.n"
      class="meter__seg"
      :class="['meter__seg--' + costume.layer, { 'meter__seg--prop': costume.proposal !== ProposalState.None }]"
    ></i>
  </span>
</template>
