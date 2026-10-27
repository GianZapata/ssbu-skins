<script setup lang="ts">
import CatalogGrid from '../features/catalog/components/CatalogGrid.vue'
import { useCatalogPage } from './composables/useCatalogPage'

useCatalogPage()
</script>

<template>
  <div data-view="catalogo" class="q-pa-md">
    <CatalogGrid />
  </div>
</template>
