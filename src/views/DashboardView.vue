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
  outboundOrigin: 'Karachi (KHI)',
  outboundDestination: 'Jeddah (JED)',
  returnOrigin: 'Jeddah (JED)',
  returnDestination: 'Karachi (KHI)',
  adults: 1,
  children: 0,
  infants: 0,
  childBedIncluded: false,
  infantBedIncluded: false,
  agentName: '',
  agentContact: '',
})

type QuoteResult = {
  adult: number
  child: number
  infant: number
  hotelSharePerBed: number
  bedCount: number
  sharingLabel: string
  adultFlightFare: number
  hotelRoomTotal: number
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
  result.value = null
  loading.value = false
}

function chooseDuration(days: number) {
  form.packageDays = days
  form.makkahDays = Math.ceil(days / 2)
  form.madinaDays = days - form.makkahDays
  result.value = null
}

function getQuotation() {
  quoteError.value = ''
  result.value = null
  const visa = visas.value.find((item) => item.id === form.visaId)
  const makkahHotel = hotels.value.find((item) => item.id === form.makkahHotelId)
  const madinaHotel = hotels.value.find((item) => item.id === form.madinaHotelId)
  const outboundTicket = tickets.value.find((item) => item.origin === form.outboundOrigin && item.destination === form.outboundDestination)
  const returnTicket = tickets.value.find((item) => item.origin === form.returnOrigin && item.destination === form.returnDestination)

  if (!visa || !makkahHotel || !madinaHotel || !outboundTicket || !returnTicket) {
    quoteError.value = 'Select a visa, both flight legs, and a hotel for each city. Add fares for the selected routes in Tickets if needed.'
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

  if (form.adults < 1) {
    quoteError.value = 'Enter at least one adult.'
    return
  }
  const bedCount = form.adults + (form.childBedIncluded ? form.children : 0) + (form.infantBedIncluded ? form.infants : 0)
  const hotelRoomTotal = makkahHotel.priceSAR * form.makkahDays + madinaHotel.priceSAR * form.madinaDays
  const hotelSharePerBed = hotelRoomTotal / bedCount
  const sharingLabel = ({ 1: 'Single', 2: 'Double', 3: 'Triple', 4: 'Quad', 5: 'Quint' } as Record<number, string>)[bedCount] || `${bedCount}-bed sharing`
  const adult = visa.adultPriceSAR + outboundTicket.adultPriceSAR + returnTicket.adultPriceSAR + hotelSharePerBed
  const child = visa.childPriceSAR + (form.childBedIncluded ? hotelSharePerBed : 0)
  const infant = visa.infantPriceSAR + (form.infantBedIncluded ? hotelSharePerBed : 0)
  result.value = {
    adult,
    child,
    infant,
    hotelSharePerBed,
    bedCount,
    sharingLabel,
    adultFlightFare: outboundTicket.adultPriceSAR + returnTicket.adultPriceSAR,
    hotelRoomTotal,
    groupTotal: adult * form.adults + child * form.children + infant * form.infants,
    travellers: travellerTotal.value,
    makkahHotel: makkahHotel.name,
    madinaHotel: madinaHotel.name,
    visa: visa.name,
    ticket: `${outboundTicket.origin} → ${outboundTicket.destination} · Return: ${returnTicket.origin} → ${returnTicket.destination}`,
    packageDays: form.packageDays,
    makkahDays: form.makkahDays,
    madinaDays: form.madinaDays,
  }
}

function quotationText() {
  if (!result.value) return ''
  const r = result.value
  return `${r.packageDays}-day Umrah quotation\n${r.makkahDays} nights Makkah · ${r.madinaDays} nights Madina\n${r.makkahHotel} / ${r.madinaHotel}\n${r.sharingLabel} sharing (${r.bedCount} beds)\nAdult: ${formatSar(r.adult)}${form.children ? `\nChild: ${formatSar(r.child)}${form.childBedIncluded ? ' (bed included)' : ''}` : ''}${form.infants ? `\nInfant: ${formatSar(r.infant)}${form.infantBedIncluded ? ' (bed included)' : ''}` : ''}\nGroup total: ${formatSar(r.groupTotal)}\n${form.agentName ? `${form.agentName}${form.agentContact ? ` · ${form.agentContact}` : ''}` : ''}`
}

async function shareQuotation() {
  const text = quotationText()
  if (navigator.share) await navigator.share({ title: 'Umrah quotation', text })
  else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
}

function shareWhatsApp() { window.open(`https://wa.me/?text=${encodeURIComponent(quotationText())}`, '_blank', 'noopener') }

async function downloadBrochure() {
  if (!result.value) return
  const r = result.value
  const esc = (value: string) => value.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!))
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1500"><rect width="100%" height="100%" fill="#edf3ef"/><rect width="100%" height="390" fill="#0d3029"/><path d="M0 340 Q300 430 600 345 T1200 350V390H0Z" fill="#d7a64d"/><text x="90" y="115" fill="#d7a64d" font-family="Georgia" font-size="37" letter-spacing="5">UMRAHQUOTE</text><text x="90" y="205" fill="white" font-family="Georgia" font-size="64">Umrah Journey</text><text x="90" y="263" fill="#c9d8d2" font-family="Arial" font-size="26">${r.packageDays} DAY PACKAGE  •  ${r.makkahDays} NIGHTS MAKKAH  •  ${r.madinaDays} NIGHTS MADINA</text><rect x="70" y="450" width="1060" height="360" rx="24" fill="white"/><text x="115" y="515" fill="#8b6a2d" font-family="Arial" font-size="20" font-weight="bold" letter-spacing="3">ACCOMMODATION</text><text x="115" y="590" fill="#173f36" font-family="Georgia" font-size="38">${esc(r.makkahHotel)}</text><text x="115" y="640" fill="#607a70" font-family="Arial" font-size="25">Makkah · ${r.makkahDays} nights</text><text x="115" y="710" fill="#173f36" font-family="Georgia" font-size="38">${esc(r.madinaHotel)}</text><text x="115" y="760" fill="#607a70" font-family="Arial" font-size="25">Madina · ${r.madinaDays} nights · ${r.sharingLabel} sharing (${r.bedCount} beds)</text><rect x="70" y="855" width="1060" height="330" rx="24" fill="#173f36"/><text x="115" y="925" fill="#d7a64d" font-family="Arial" font-size="20" font-weight="bold" letter-spacing="3">PACKAGE INVESTMENT</text><text x="115" y="1010" fill="white" font-family="Arial" font-size="30">Adult × ${form.adults}</text><text x="1080" y="1010" fill="white" font-family="Georgia" font-size="38" text-anchor="end">${esc(formatSar(r.adult))}</text>${form.children ? `<text x="115" y="1065" fill="white" font-family="Arial" font-size="30">Child × ${form.children}${form.childBedIncluded ? ' · bed included' : ''}</text><text x="1080" y="1065" fill="white" font-family="Georgia" font-size="38" text-anchor="end">${esc(formatSar(r.child))}</text>` : ''}${form.infants ? `<text x="115" y="1120" fill="white" font-family="Arial" font-size="30">Infant × ${form.infants}${form.infantBedIncluded ? ' · bed included' : ''}</text><text x="1080" y="1120" fill="white" font-family="Georgia" font-size="38" text-anchor="end">${esc(formatSar(r.infant))}</text>` : ''}<rect x="70" y="1235" width="1060" height="150" rx="24" fill="#d7a64d"/><text x="115" y="1300" fill="#173f36" font-family="Arial" font-size="23" font-weight="bold">TOTAL PACKAGE PRICE</text><text x="1080" y="1325" fill="#173f36" font-family="Georgia" font-size="52" font-weight="bold" text-anchor="end">${esc(formatSar(r.groupTotal))}</text><text x="90" y="1450" fill="#607a70" font-family="Arial" font-size="23">${esc(form.agentName || 'Travel Agent')}${form.agentContact ? `  ·  ${esc(form.agentContact)}` : ''}</text></svg>`
  const image = new Image(); image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  await new Promise<void>((resolve) => { image.onload = () => resolve() })
  const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 1500
  canvas.getContext('2d')?.drawImage(image, 0, 0)
  const link = document.createElement('a'); link.download = 'umrah-quotation-brochure.png'; link.href = canvas.toDataURL('image/png'); link.click()
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
                <label>Package duration (days)<input v-model.number="form.packageDays" min="1" type="number" @change="chooseDuration(form.packageDays)" /></label>
                <div class="form-row compact-fields"><label>Makkah stay (days)<input v-model.number="form.makkahDays" min="0" type="number" /></label><label>Madina stay (days)<input v-model.number="form.madinaDays" min="0" type="number" /></label></div>
                <p class="stay-check" :class="{ invalid: stayTotal !== form.packageDays }">{{ stayTotal }} of {{ form.packageDays }} package days assigned</p>
              </div>
            </section>

            <section class="builder-section">
              <div class="step-number">2</div>
              <div class="builder-body"><h3>Select services</h3><p>Choose the catalogue entries included in this package.</p>
                <div class="quote-fields">
                  <label>Visa<select v-model="form.visaId"><option v-for="visa in visas" :key="visa.id" :value="visa.id">{{ visa.name }} · {{ visa.validityDays }} days</option></select></label>
                  <div class="form-row"><label>Outbound origin<select v-model="form.outboundOrigin"><option>Karachi (KHI)</option><option>Islamabad (ISB)</option><option>Lahore (LHE)</option><option>Multan (MUX)</option></select></label><label>Outbound destination<select v-model="form.outboundDestination"><option>Jeddah (JED)</option><option>Madina (MED)</option></select></label></div>
                  <div class="form-row"><label>Return origin<select v-model="form.returnOrigin"><option>Jeddah (JED)</option><option>Madina (MED)</option></select></label><label>Return destination<select v-model="form.returnDestination"><option>Karachi (KHI)</option><option>Islamabad (ISB)</option><option>Lahore (LHE)</option><option>Multan (MUX)</option></select></label></div>
                  <label>Makkah hotel<select v-model="form.makkahHotelId"><option v-for="hotel in makkahHotels" :key="hotel.id" :value="hotel.id">{{ hotel.name }} · {{ formatSar(hotel.priceSAR) }} room/night</option></select></label>
                  <label>Madina hotel<select v-model="form.madinaHotelId"><option v-for="hotel in madinaHotels" :key="hotel.id" :value="hotel.id">{{ hotel.name }} · {{ formatSar(hotel.priceSAR) }} room/night</option></select></label>
                </div>
              </div>
            </section>

            <section class="builder-section">
              <div class="step-number">3</div>
              <div class="builder-body"><h3>Travellers</h3><p>Hotel room cost is divided only among travellers with a bed.</p>
                <div class="traveller-fields"><label>Adults<input v-model.number="form.adults" min="0" type="number" /></label><label>Children<input v-model.number="form.children" min="0" type="number" /></label><label>Infants<input v-model.number="form.infants" min="0" type="number" /></label></div>
                <div class="form-row"><label class="checkbox-label"><input v-model="form.childBedIncluded" type="checkbox" /><span><strong>Bed included for children</strong><small>Include each child in hotel room sharing.</small></span></label><label class="checkbox-label"><input v-model="form.infantBedIncluded" type="checkbox" /><span><strong>Bed included for infants</strong><small>Include each infant in hotel room sharing.</small></span></label></div>
              </div>
            </section>
            <section class="builder-section"><div class="step-number">4</div><div class="builder-body"><h3>Brochure details</h3><p>Optional travel-agent details printed on the downloadable brochure.</p><div class="form-row"><label>Agent name<input v-model="form.agentName" placeholder="Agency or consultant name" /></label><label>Contact<input v-model="form.agentContact" placeholder="Phone / WhatsApp" /></label></div></div></section>
            <p v-if="quoteError" class="form-error">{{ quoteError }}</p>
            <button class="quote-button">✦ Get quotation</button>
          </form>

          <aside class="quote-result" :class="{ empty: !result }">
            <template v-if="result">
              <p class="eyebrow">YOUR QUOTATION</p><h2>{{ result.packageDays }} day Umrah</h2>
              <div class="result-route"><span>{{ result.makkahDays }}d Makkah</span><i></i><span>{{ result.madinaDays }}d Madina</span></div>
              <div class="result-prices">
                <div v-if="form.adults"><span>PER ADULT</span><strong>{{ formatSar(result.adult) }}</strong><small>× {{ form.adults }}</small></div>
                <div v-if="form.children"><span>PER CHILD</span><strong>{{ formatSar(result.child) }}</strong><small>× {{ form.children }} · {{ form.childBedIncluded ? 'bed included' : 'no hotel bed' }}</small></div>
                <div v-if="form.infants"><span>PER INFANT</span><strong>{{ formatSar(result.infant) }}</strong><small>× {{ form.infants }} · {{ form.infantBedIncluded ? 'bed included' : 'no hotel bed' }}</small></div>
              </div>
              <div class="result-total"><span>GROUP TOTAL</span><strong>{{ formatSar(result.groupTotal) }}</strong><small>{{ result.travellers }} travellers · {{ result.sharingLabel }} sharing · {{ formatSar(result.hotelSharePerBed) }}/bed</small></div>
              <dl><div><dt>Visa</dt><dd>{{ result.visa }} · adult {{ formatSar(visas.find(item => item.id === form.visaId)?.adultPriceSAR || 0) }}</dd></div><div><dt>Flights — adult return fare</dt><dd>{{ result.ticket }} · {{ formatSar(result.adultFlightFare) }}</dd></div><div><dt>Hotel rooms</dt><dd>{{ result.makkahHotel }} + {{ result.madinaHotel }} · {{ formatSar(result.hotelRoomTotal) }}</dd></div><div><dt>Room sharing</dt><dd>{{ result.sharingLabel }} · {{ result.bedCount }} beds · {{ formatSar(result.hotelSharePerBed) }} per bed</dd></div><div><dt>Child / infant tickets</dt><dd>Not included — the ticket catalogue has adult fares only.</dd></div></dl>
              <div class="modal-actions"><button class="secondary-button" type="button" @click="shareWhatsApp">WhatsApp message</button><button class="secondary-button" type="button" @click="shareQuotation">Share</button><button class="primary-button" type="button" @click="downloadBrochure">Download brochure PNG</button></div>
            </template>
            <template v-else><div class="result-placeholder"><span>✦</span><h3>Your quotation will appear here</h3><p>Complete the package details and select Get quotation.</p></div></template>
          </aside>
        </div>
      </section>
    </main>
  </div>
</template>
