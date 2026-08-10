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
  agentName: '',
  agentContact: '',
  whatsappReceiver: '',
})

type QuoteResult = {
  adult: number
  child: number
  infant: number
  makkahHotelPerAdultNight: number
  madinaHotelPerAdultNight: number
  makkahHotelPerAdult: number
  madinaHotelPerAdult: number
  sharingLabel: string
  adultFlightFare: number
  outboundFare: number
  returnFare: number
  adultVisaFare: number
  childVisaFare: number
  infantVisaFare: number
  childFlightFare: number
  infantFlightFare: number
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
  const hotelRoomTotal = makkahHotel.priceSAR * form.makkahDays + madinaHotel.priceSAR * form.madinaDays
  const makkahHotelPerAdultNight = makkahHotel.priceSAR / form.adults
  const madinaHotelPerAdultNight = madinaHotel.priceSAR / form.adults
  const makkahHotelPerAdult = makkahHotelPerAdultNight * form.makkahDays
  const madinaHotelPerAdult = madinaHotelPerAdultNight * form.madinaDays
  const hotelSharePerAdult = makkahHotelPerAdult + madinaHotelPerAdult
  const sharingLabel = ({ 1: 'Single', 2: 'Double', 3: 'Triple', 4: 'Quad', 5: 'Quint' } as Record<number, string>)[form.adults] || `${form.adults}-adult sharing`
  const adult = visa.adultPriceSAR + outboundTicket.adultPriceSAR + returnTicket.adultPriceSAR + hotelSharePerAdult
  const childFlightFare = outboundTicket.childPriceSAR + returnTicket.childPriceSAR
  const infantFlightFare = outboundTicket.infantPriceSAR + returnTicket.infantPriceSAR
  const child = visa.childPriceSAR + childFlightFare
  const infant = visa.infantPriceSAR + infantFlightFare
  result.value = {
    adult,
    child,
    infant,
    makkahHotelPerAdultNight,
    madinaHotelPerAdultNight,
    makkahHotelPerAdult,
    madinaHotelPerAdult,
    sharingLabel,
    adultFlightFare: outboundTicket.adultPriceSAR + returnTicket.adultPriceSAR,
    outboundFare: outboundTicket.adultPriceSAR,
    returnFare: returnTicket.adultPriceSAR,
    adultVisaFare: visa.adultPriceSAR,
    childVisaFare: visa.childPriceSAR,
    infantVisaFare: visa.infantPriceSAR,
    childFlightFare,
    infantFlightFare,
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
  return `${r.packageDays}-day Umrah quotation\n${r.makkahDays} nights Makkah · ${r.madinaDays} nights Madina\n\nADULT PRICE BREAKDOWN\nVisa: ${formatSar(r.adultVisaFare)}\nOutbound flight: ${formatSar(r.outboundFare)}\nReturn flight: ${formatSar(r.returnFare)}\nMakkah hotel: ${formatSar(r.makkahHotelPerAdultNight)}/night × ${r.makkahDays} = ${formatSar(r.makkahHotelPerAdult)}\nMadina hotel: ${formatSar(r.madinaHotelPerAdultNight)}/night × ${r.madinaDays} = ${formatSar(r.madinaHotelPerAdult)}\nAdult per head: ${formatSar(r.adult)}\n\nGROUP BILL\nAdults: ${formatSar(r.adult)} × ${form.adults} = ${formatSar(r.adult * form.adults)}${form.children ? `\nChildren (visa + return flights): ${formatSar(r.child)} × ${form.children} = ${formatSar(r.child * form.children)}` : ''}${form.infants ? `\nInfants (visa + return flights): ${formatSar(r.infant)} × ${form.infants} = ${formatSar(r.infant * form.infants)}` : ''}\nGROUP TOTAL: ${formatSar(r.groupTotal)}\n${form.agentName ? `${form.agentName}${form.agentContact ? ` · ${form.agentContact}` : ''}` : ''}`
}

async function shareQuotation() {
  const text = quotationText()
  if (navigator.share) await navigator.share({ title: 'Umrah quotation', text })
  else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
}

function shareWhatsApp() {
  const enteredNumber = form.whatsappReceiver.replace(/\D/g, '')
  const receiver = enteredNumber.startsWith('03') ? `92${enteredNumber.slice(1)}` : enteredNumber
  window.open(`https://wa.me/${receiver ? receiver : ''}?text=${encodeURIComponent(quotationText())}`, '_blank', 'noopener')
}

async function downloadBrochure() {
  if (!result.value) return
  const r = result.value
  const esc = (value: string) => value.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!))
  const adultRows: Array<[string, string]> = [
    ['Visa', formatSar(r.adultVisaFare)], ['Outbound flight', formatSar(r.outboundFare)], ['Return flight', formatSar(r.returnFare)],
    [`Makkah hotel (${r.makkahDays} nights)`, formatSar(r.makkahHotelPerAdult)], [`Madina hotel (${r.madinaDays} nights)`, formatSar(r.madinaHotelPerAdult)],
  ]
  const groupRows: Array<[string, string]> = [
    [`Adults × ${form.adults}`, formatSar(r.adult * form.adults)],
    ...(form.children ? [[`Children × ${form.children}`, formatSar(r.child * form.children)] as [string, string]] : []),
    ...(form.infants ? [[`Infants × ${form.infants}`, formatSar(r.infant * form.infants)] as [string, string]] : []),
  ]
  const rows = (items: Array<[string, string]>, start: number, dark = false) => items.map(([label, value], i) => `<text x="125" y="${start + i * 55}" fill="${dark ? 'white' : '#173f36'}" font-family="Arial" font-size="25">${esc(label)}</text><text x="1075" y="${start + i * 55}" fill="${dark ? '#f0cc7e' : '#173f36'}" font-family="Georgia" font-size="29" text-anchor="end">${esc(value)}</text>`).join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1800"><rect width="100%" height="100%" fill="#edf3ef"/><rect width="100%" height="320" fill="#0d3029"/><text x="90" y="105" fill="#d7a64d" font-family="Georgia" font-size="37" letter-spacing="5">UMRAHQUOTE</text><text x="90" y="190" fill="white" font-family="Georgia" font-size="62">Umrah quotation</text><text x="90" y="245" fill="#c9d8d2" font-family="Arial" font-size="25">${r.packageDays} DAYS · ${r.makkahDays} NIGHTS MAKKAH · ${r.madinaDays} NIGHTS MADINA</text><rect x="70" y="370" width="1060" height="285" rx="24" fill="white"/><text x="115" y="430" fill="#8b6a2d" font-family="Arial" font-size="19" font-weight="bold" letter-spacing="3">HOTELS &amp; SHARING</text><text x="115" y="495" fill="#173f36" font-family="Georgia" font-size="35">${esc(r.makkahHotel)}</text><text x="115" y="540" fill="#607a70" font-family="Arial" font-size="23">Makkah · ${formatSar(r.makkahHotelPerAdultNight)} per adult/night</text><text x="115" y="595" fill="#173f36" font-family="Georgia" font-size="35">${esc(r.madinaHotel)}</text><text x="115" y="635" fill="#607a70" font-family="Arial" font-size="23">Madina · ${r.sharingLabel} · room divided by ${form.adults} adults</text><rect x="70" y="700" width="1060" height="410" rx="24" fill="white"/><text x="115" y="765" fill="#8b6a2d" font-family="Arial" font-size="19" font-weight="bold" letter-spacing="3">ADULT PRICE — PER HEAD</text>${rows(adultRows, 835)}<line x1="115" y1="1110" x2="1085" y2="1110" stroke="#d8e2dd"/><text x="125" y="1165" fill="#173f36" font-family="Arial" font-size="27" font-weight="bold">Adult per head</text><text x="1075" y="1165" fill="#173f36" font-family="Georgia" font-size="37" font-weight="bold" text-anchor="end">${esc(formatSar(r.adult))}</text><rect x="70" y="1210" width="1060" height="390" rx="24" fill="#173f36"/><text x="115" y="1275" fill="#d7a64d" font-family="Arial" font-size="19" font-weight="bold" letter-spacing="3">GROUP BILL</text>${rows(groupRows, 1345, true)}<line x1="115" y1="1535" x2="1085" y2="1535" stroke="#41665e"/><text x="125" y="1590" fill="white" font-family="Arial" font-size="28" font-weight="bold">GROUP TOTAL</text><text x="1075" y="1590" fill="#f0cc7e" font-family="Georgia" font-size="45" font-weight="bold" text-anchor="end">${esc(formatSar(r.groupTotal))}</text><text x="90" y="1700" fill="#607a70" font-family="Arial" font-size="23">${esc(form.agentName || 'Travel Agent')}${form.agentContact ? `  ·  ${esc(form.agentContact)}` : ''}</text><text x="90" y="1740" fill="#607a70" font-family="Arial" font-size="20">Flights: ${esc(r.ticket)}</text></svg>`
  const image = new Image(); image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  await new Promise<void>((resolve) => { image.onload = () => resolve() })
  const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 1800
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
              <div class="builder-body"><h3>Travellers</h3><p>Hotel room cost is divided only among adults. Children and infants do not have a hotel bed charge.</p>
                <div class="traveller-fields"><label>Adults<input v-model.number="form.adults" min="0" type="number" /></label><label>Children<input v-model.number="form.children" min="0" type="number" /></label><label>Infants<input v-model.number="form.infants" min="0" type="number" /></label></div>
              </div>
            </section>
            <section class="builder-section"><div class="step-number">4</div><div class="builder-body"><h3>Brochure & sharing details</h3><p>Agent details are printed on the brochure. Add a WhatsApp number to send the message directly to that recipient.</p><div class="form-row"><label>Agent name<input v-model="form.agentName" placeholder="Agency or consultant name" /></label><label>Contact<input v-model="form.agentContact" placeholder="Phone / WhatsApp" /></label></div><label>WhatsApp receiver number<input v-model="form.whatsappReceiver" inputmode="tel" placeholder="e.g. 03001234567" type="tel" /></label></div></section>
            <p v-if="quoteError" class="form-error">{{ quoteError }}</p>
            <button class="quote-button">✦ Get quotation</button>
          </form>

          <aside class="quote-result" :class="{ empty: !result }">
            <template v-if="result">
              <p class="eyebrow">YOUR QUOTATION</p><h2>{{ result.packageDays }} day Umrah</h2>
              <div class="result-route"><span>{{ result.makkahDays }}d Makkah</span><i></i><span>{{ result.madinaDays }}d Madina</span></div>
              <section class="quote-breakdown"><h3>Adult price — per head</h3><dl><div><dt>Visa</dt><dd>{{ result.visa }} · {{ formatSar(result.adultVisaFare) }}</dd></div><div><dt>Outbound flight</dt><dd>{{ form.outboundOrigin }} → {{ form.outboundDestination }} · {{ formatSar(result.outboundFare) }}</dd></div><div><dt>Return flight</dt><dd>{{ form.returnOrigin }} → {{ form.returnDestination }} · {{ formatSar(result.returnFare) }}</dd></div><div><dt>Makkah hotel</dt><dd>{{ formatSar(result.makkahHotelPerAdultNight) }}/night × {{ result.makkahDays }} = {{ formatSar(result.makkahHotelPerAdult) }}</dd></div><div><dt>Madina hotel</dt><dd>{{ formatSar(result.madinaHotelPerAdultNight) }}/night × {{ result.madinaDays }} = {{ formatSar(result.madinaHotelPerAdult) }}</dd></div></dl><div class="per-head-total"><span>ADULT PER HEAD</span><strong>{{ formatSar(result.adult) }}</strong><small>{{ result.sharingLabel }} · room rate split between {{ form.adults }} adults</small></div></section>
              <section class="quote-breakdown"><h3>Group bill</h3><div class="result-prices"><div><span>ADULTS</span><strong>{{ formatSar(result.adult * form.adults) }}</strong><small>{{ formatSar(result.adult) }} × {{ form.adults }}</small></div><div v-if="form.children"><span>CHILDREN — VISA + FLIGHTS</span><strong>{{ formatSar(result.child * form.children) }}</strong><small>Visa {{ formatSar(result.childVisaFare) }} + return flights {{ formatSar(result.childFlightFare) }} · {{ formatSar(result.child) }} × {{ form.children }}</small></div><div v-if="form.infants"><span>INFANTS — VISA + FLIGHTS</span><strong>{{ formatSar(result.infant * form.infants) }}</strong><small>Visa {{ formatSar(result.infantVisaFare) }} + return flights {{ formatSar(result.infantFlightFare) }} · {{ formatSar(result.infant) }} × {{ form.infants }}</small></div></div></section>
              <div class="result-total"><span>GROUP TOTAL</span><strong>{{ formatSar(result.groupTotal) }}</strong><small>{{ result.travellers }} travellers</small></div>
              <div class="modal-actions"><button class="secondary-button" type="button" @click="shareWhatsApp">WhatsApp message</button><button class="secondary-button" type="button" @click="shareQuotation">Share</button><button class="primary-button" type="button" @click="downloadBrochure">Download brochure PNG</button></div>
            </template>
            <template v-else><div class="result-placeholder"><span>✦</span><h3>Your quotation will appear here</h3><p>Complete the package details and select Get quotation.</p></div></template>
          </aside>
        </div>
      </section>
    </main>
  </div>
</template>
