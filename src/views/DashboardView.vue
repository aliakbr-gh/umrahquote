<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import AppHeader from '../components/AppHeader.vue'
import AppSidebar from '../components/AppSidebar.vue'
import { useCurrency } from '../composables/useCurrency'
import { db, type Hotel, type Ticket, type Visa } from '../db'

const { formatSar } = useCurrency()
const visas = ref<Visa[]>([])
const hotels = ref<Hotel[]>([])
const tickets = ref<Ticket[]>([])
const loading = ref(true)
const quoteError = ref('')

const form = reactive({
  packageDays: 15,
  makkahDays: 8,
  madinaDays: 7,
  visaId: null as number | null,
  makkahHotelId: null as number | null,
  madinaHotelId: null as number | null,
  ticketId: null as number | null,
  adults: 1,
  children: 0,
  infants: 0,
})

type QuoteResult = {
  adult: number
  child: number
  infant: number
  groupTotal: number
  travellers: number
  makkahHotel: string
  madinaHotel: string
  visa: string
  ticket: string
  packageDays: number
  makkahDays: number
  madinaDays: number
}
const result = ref<QuoteResult | null>(null)

const makkahHotels = computed(() => hotels.value.filter((hotel) => hotel.location === 'Makkah'))
const madinaHotels = computed(() => hotels.value.filter((hotel) => hotel.location === 'Madina'))
const stayTotal = computed(() => Number(form.makkahDays) + Number(form.madinaDays))
const travellerTotal = computed(() => Number(form.adults) + Number(form.children) + Number(form.infants))
const hasCatalogue = computed(() => visas.value.length && makkahHotels.value.length && madinaHotels.value.length && tickets.value.length)

async function loadCatalogue() {
  loading.value = true
  ;[visas.value, hotels.value, tickets.value] = await Promise.all([
    db.visas.toArray(), db.hotels.toArray(), db.tickets.toArray(),
  ])
  form.visaId = visas.value[0]?.id ?? null
  form.makkahHotelId = makkahHotels.value[0]?.id ?? null
  form.madinaHotelId = madinaHotels.value[0]?.id ?? null
  form.ticketId = tickets.value[0]?.id ?? null
  result.value = null
  loading.value = false
}

function chooseDuration(days: number) {
  form.packageDays = days
  form.makkahDays = days === 15 ? 8 : 11
  form.madinaDays = days - form.makkahDays
  result.value = null
}

function getQuotation() {
  quoteError.value = ''
  result.value = null
  const visa = visas.value.find((item) => item.id === form.visaId)
  const makkahHotel = hotels.value.find((item) => item.id === form.makkahHotelId)
  const madinaHotel = hotels.value.find((item) => item.id === form.madinaHotelId)
  const ticket = tickets.value.find((item) => item.id === form.ticketId)

  if (!visa || !makkahHotel || !madinaHotel || !ticket) {
    quoteError.value = 'Select a visa, ticket, and hotel for both cities.'
    return
  }
  if (stayTotal.value !== Number(form.packageDays)) {
    quoteError.value = `Makkah and Madina stays must total ${form.packageDays} days.`
    return
  }
  if (travellerTotal.value < 1) {
    quoteError.value = 'Add at least one traveller.'
    return
  }

  const hotelPerPerson = makkahHotel.priceSAR * form.makkahDays + madinaHotel.priceSAR * form.madinaDays
  const adult = visa.adultPriceSAR + ticket.adultPriceSAR + hotelPerPerson
  const child = visa.childPriceSAR + ticket.childPriceSAR + hotelPerPerson
  const infant = visa.infantPriceSAR + ticket.infantPriceSAR
  result.value = {
    adult,
    child,
    infant,
    groupTotal: adult * form.adults + child * form.children + infant * form.infants,
    travellers: travellerTotal.value,
    makkahHotel: makkahHotel.name,
    madinaHotel: madinaHotel.name,
    visa: visa.name,
    ticket: `${ticket.origin} → ${ticket.destination}`,
    packageDays: form.packageDays,
    makkahDays: form.makkahDays,
    madinaDays: form.madinaDays,
  }
}

onMounted(() => {
  loadCatalogue()
  window.addEventListener('umrahquote:data-reset', loadCatalogue)
})
onBeforeUnmount(() => window.removeEventListener('umrahquote:data-reset', loadCatalogue))
</script>

<template>
  <div class="app-shell">
    <AppSidebar />
    <main>
      <AppHeader title="Quotation maker" />
      <section class="content dashboard-content">
        <div class="dashboard-hero">
          <div><p class="eyebrow">BUILD A PACKAGE</p><h2>Create an Umrah quotation</h2><p>Choose the package details and get transparent per-person pricing instantly.</p></div>
          <div class="hero-mark">✦</div>
        </div>

        <div v-if="loading" class="empty-state">Loading your catalogue…</div>
        <div v-else-if="!hasCatalogue" class="empty-state">
          <div class="empty-icon">✦</div><h3>Your catalogue is not ready</h3><p>Add a visa, ticket, and hotels for both Makkah and Madina—or use Import test data in the sidebar.</p>
        </div>
        <div v-else class="quote-layout">
          <form class="quote-builder" @submit.prevent="getQuotation">
            <section class="builder-section">
              <div class="step-number">1</div>
              <div class="builder-body"><h3>Package duration</h3><p>Select a popular duration or adjust the stays below.</p>
                <div class="duration-options"><button type="button" :class="{ selected: form.packageDays === 15 }" @click="chooseDuration(15)">15 days</button><button type="button" :class="{ selected: form.packageDays === 21 }" @click="chooseDuration(21)">21 days</button></div>
                <div class="form-row compact-fields"><label>Makkah stay (days)<input v-model.number="form.makkahDays" min="0" type="number" /></label><label>Madina stay (days)<input v-model.number="form.madinaDays" min="0" type="number" /></label></div>
                <p class="stay-check" :class="{ invalid: stayTotal !== form.packageDays }">{{ stayTotal }} of {{ form.packageDays }} package days assigned</p>
              </div>
            </section>

            <section class="builder-section">
              <div class="step-number">2</div>
              <div class="builder-body"><h3>Select services</h3><p>Choose the catalogue entries included in this package.</p>
                <div class="quote-fields">
                  <label>Visa<select v-model="form.visaId"><option v-for="visa in visas" :key="visa.id" :value="visa.id">{{ visa.name }} · {{ visa.validityDays }} days</option></select></label>
                  <label>Ticket<select v-model="form.ticketId"><option v-for="ticket in tickets" :key="ticket.id" :value="ticket.id">{{ ticket.origin }} → {{ ticket.destination }}</option></select></label>
                  <label>Makkah hotel<select v-model="form.makkahHotelId"><option v-for="hotel in makkahHotels" :key="hotel.id" :value="hotel.id">{{ hotel.name }} · {{ formatSar(hotel.priceSAR) }}/night</option></select></label>
                  <label>Madina hotel<select v-model="form.madinaHotelId"><option v-for="hotel in madinaHotels" :key="hotel.id" :value="hotel.id">{{ hotel.name }} · {{ formatSar(hotel.priceSAR) }}/night</option></select></label>
                </div>
              </div>
            </section>

            <section class="builder-section">
              <div class="step-number">3</div>
              <div class="builder-body"><h3>Travellers</h3><p>Enter how many people are travelling in each category.</p>
                <div class="traveller-fields"><label>Adults<input v-model.number="form.adults" min="0" type="number" /></label><label>Children<input v-model.number="form.children" min="0" type="number" /></label><label>Infants<input v-model.number="form.infants" min="0" type="number" /></label></div>
              </div>
            </section>
            <p v-if="quoteError" class="form-error">{{ quoteError }}</p>
            <button class="quote-button">✦ Get quotation</button>
          </form>

          <aside class="quote-result" :class="{ empty: !result }">
            <template v-if="result">
              <p class="eyebrow">YOUR QUOTATION</p><h2>{{ result.packageDays }} day Umrah</h2>
              <div class="result-route"><span>{{ result.makkahDays }}d Makkah</span><i></i><span>{{ result.madinaDays }}d Madina</span></div>
              <div class="result-prices">
                <div v-if="form.adults"><span>PER ADULT</span><strong>{{ formatSar(result.adult) }}</strong><small>× {{ form.adults }}</small></div>
                <div v-if="form.children"><span>PER CHILD</span><strong>{{ formatSar(result.child) }}</strong><small>× {{ form.children }}</small></div>
                <div v-if="form.infants"><span>PER INFANT</span><strong>{{ formatSar(result.infant) }}</strong><small>× {{ form.infants }} · no hotel bed</small></div>
              </div>
              <div class="result-total"><span>GROUP TOTAL</span><strong>{{ formatSar(result.groupTotal) }}</strong><small>{{ result.travellers }} travellers</small></div>
              <dl><div><dt>Visa</dt><dd>{{ result.visa }}</dd></div><div><dt>Ticket</dt><dd>{{ result.ticket }}</dd></div><div><dt>Makkah</dt><dd>{{ result.makkahHotel }}</dd></div><div><dt>Madina</dt><dd>{{ result.madinaHotel }}</dd></div></dl>
            </template>
            <template v-else><div class="result-placeholder"><span>✦</span><h3>Your quotation will appear here</h3><p>Complete the package details and select Get quotation.</p></div></template>
          </aside>
        </div>
      </section>
    </main>
  </div>
</template>
