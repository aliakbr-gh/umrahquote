<script setup lang="ts">
import AppHeader from '../components/AppHeader.vue'
import AppSidebar from '../components/AppSidebar.vue'
import { useCurrency } from '../composables/useCurrency'

const { rate, rateMode, isSyncing, syncError, setRateMode, setCustomRate, syncRate } = useCurrency()
</script>

<template>
  <div class="app-shell"><AppSidebar /><main><AppHeader title="Exchange rate" />
    <section class="content"><div class="section-heading hotel-heading"><div><p class="eyebrow">CURRENCY SETTINGS</p><h2>SAR to PKR exchange rate</h2><p>Choose a live rate or set the rate your agency uses for calculations.</p></div></div>
      <article class="backup-card" style="max-width:620px"><div class="form-row"><label><input v-model="rateMode" value="live" type="radio" @change="setRateMode('live')" /> Live exchange rate</label><label><input v-model="rateMode" value="custom" type="radio" @change="setRateMode('custom')" /> Custom exchange rate</label></div>
        <label>1 SAR = PKR<input :value="rate" :disabled="rateMode === 'live'" min="0.01" step="0.01" type="number" @input="setCustomRate(Number(($event.target as HTMLInputElement).value))" /></label>
        <p class="form-hint">{{ rateMode === 'live' ? 'The rate is refreshed from the configured public exchange-rate source.' : 'Custom rate is saved locally and used until you switch back to live.' }}</p><p v-if="syncError" class="form-error">{{ syncError }}</p><button v-if="rateMode === 'live'" class="primary-button" :disabled="isSyncing" @click="syncRate(true)">{{ isSyncing ? 'Refreshing…' : 'Refresh live rate' }}</button>
      </article>
    </section></main></div>
</template>
