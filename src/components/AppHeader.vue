<script setup lang="ts">
import { computed } from 'vue'
import { useCurrency } from '../composables/useCurrency'

defineProps<{ title: string }>()

const { currency, rate, rateUpdatedAt, isSyncing, syncError, setCurrency, syncRate } = useCurrency()
const lastUpdated = computed(() =>
  rateUpdatedAt.value
    ? new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(rateUpdatedAt.value),
    )
    : 'Not synced yet',
)
</script>

<template>
  <header class="topbar">
    <div>
      <p class="eyebrow">UMRAH OPERATIONS</p>
      <h1>{{ title }}</h1>
    </div>
    <div class="header-tools">
      <div class="header-rate" :title="syncError || 'Click to refresh the exchange rate'">
        <div>
          <span>LIVE EXCHANGE RATE</span>
          <strong>1 SAR = {{ rate.toFixed(2) }} PKR</strong>
          <small>Updated {{ lastUpdated }}</small>
        </div>
        <button :disabled="isSyncing" aria-label="Refresh exchange rate" @click="syncRate(true)">
          {{ isSyncing ? '…' : '↻' }}
        </button>
      </div>
      <div class="currency-control" aria-label="Display currency">
        <button :class="{ selected: currency === 'SAR' }" @click="setCurrency('SAR')">SAR</button>
        <button :class="{ selected: currency === 'PKR' }" @click="setCurrency('PKR')">PKR</button>
      </div>
    </div>
  </header>
</template>
