<script setup lang="ts">
import AppImg from '../../../components/AppImg.vue'
import { ProposalState } from '../enums/ProposalState'
import type { RosterRow } from '../../../pages/composables/useRosterPage'
import { trajeName } from '../../../shared/helpers/text'
import CostumeMeter from './CostumeMeter.vue'

interface RosterRowProps {
  row: RosterRow
  compact: boolean
}

const props = defineProps<RosterRowProps>()
</script>

<template>
  <section
    class="rrow"
    :class="{ 'rrow--large': !props.compact }"
    :data-fighter="props.row.fighter.code"
    :data-keep="props.row.fighter.code"
    :aria-label="props.row.fighter.name"
  >
    <a class="rrow__head" :href="props.row.href" :aria-label="'Abrir ' + props.row.fighter.name + ', ' + props.row.meterLabel">
      <span class="rrow__face">
        <AppImg v-if="props.row.fighter.portrait" :src="props.row.fighter.portrait" fit="contain" />
        <span v-else class="ft__ph" aria-hidden="true"><span>{{ props.row.initial }}</span></span>
      </span>
      <span class="rrow__name">{{ props.row.fighter.name }}</span>
      <CostumeMeter :costumes="props.row.costumes" :label="props.row.meterLabel" />
      <span class="rrow__own" aria-hidden="true">{{ props.row.own }}</span>
      <span v-if="props.row.proposals" class="rrow__prop">{{ props.row.proposalsLabel }}</span>
    </a>

    <ul class="rrow__costumes" :aria-label="'Trajes de ' + props.row.fighter.name">
      <li v-for="costume in props.row.costumes" :key="costume.n">
        <a
          class="rcost"
          :class="['rcost--' + costume.layer, { 'rcost--prop': costume.proposal !== ProposalState.None, 'rcost--hit': costume.hit }]"
          :href="costume.href"
          :aria-label="costume.label"
          :data-n="costume.n + 1"
          :data-pending="costume.proposal !== ProposalState.None ? 'true' : undefined"
        >
          <span class="rcost__img">
            <AppImg :src="costume.img" fit="contain" :missing="costume.img ? '' : 'Sin retrato'" />
          </span>
          <span class="rcost__txt">
            <b>{{ trajeName(costume.n) }}</b>
            <span>{{ costume.name }}</span>
            <em>{{ costume.layerLabel }}</em>
          </span>
          <span v-if="costume.proposalLabel" class="rcost__tag">{{ costume.proposalLabel }}</span>
        </a>
      </li>
    </ul>
  </section>
</template>
