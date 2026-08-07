<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { db, type Hotel, type HotelLocation, type SharingType } from '../db'
import { useCurrency } from '../composables/useCurrency'
import AppSidebar from '../components/AppSidebar.vue'
import AppHeader from '../components/AppHeader.vue'

const { formatSar } = useCurrency()
const hotels = ref<Hotel[]>([])
const loading = ref(true)
const saving = ref(false)
const showForm = ref(false)
const editingId = ref<number | null>(null)
const errorMessage = ref('')

type HotelForm = {
  name: string
  location: HotelLocation
  umrahDays: number | null
  sharingType: SharingType
  distanceMeters: number | null
  priceSAR: number | null
  transportationIncluded: boolean
}

const emptyForm = (): HotelForm => ({
  name: '',
  location: 'Makkah',
  umrahDays: null,
  sharingType: 'Quint',
  distanceMeters: null,
  priceSAR: null,
  transportationIncluded: false,
})

const form = reactive<HotelForm>(emptyForm())
const isEditing = computed(() => editingId.value !== null)
const landmark = computed(() => (form.location === 'Makkah' ? 'Haram' : 'Masjid-e-Nabawi'))

async function loadHotels() {
  loading.value = true
  hotels.value = await db.hotels.orderBy('updatedAt').reverse().toArray()
  loading.value = false
}

function openCreate() {
  editingId.value = null
  Object.assign(form, emptyForm())
  errorMessage.value = ''
  showForm.value = true
}

function openEdit(hotel: Hotel) {
  editingId.value = hotel.id ?? null
  Object.assign(form, {
    name: hotel.name,
    location: hotel.location,
    umrahDays: hotel.umrahDays,
    sharingType: hotel.sharingType,
    distanceMeters: hotel.distanceMeters,
    priceSAR: hotel.priceSAR,
    transportationIncluded: hotel.transportationIncluded,
  })
  errorMessage.value = ''
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  editingId.value = null
}

async function saveHotel() {
  errorMessage.value = ''
  if (!form.name.trim()) {
    errorMessage.value = 'Enter the hotel name.'
    return
  }
  if (form.umrahDays === null || form.umrahDays < 1 || form.distanceMeters === null || form.distanceMeters < 0 || form.priceSAR === null || form.priceSAR < 0) {
    errorMessage.value = 'Enter valid days, distance, and price.'
    return
  }

  saving.value = true
  const now = new Date().toISOString()
  const record = {
    name: form.name.trim(),
    location: form.location,
    umrahDays: Number(form.umrahDays),
    sharingType: form.sharingType,
    distanceMeters: Number(form.distanceMeters),
    priceSAR: Number(form.priceSAR),
    transportationIncluded: form.transportationIncluded,
    updatedAt: now,
  }
  if (editingId.value !== null) await db.hotels.update(editingId.value, record)
  else await db.hotels.add({ ...record, createdAt: now })
  await loadHotels()
  saving.value = false
  closeForm()
}

async function removeHotel(hotel: Hotel) {
  if (hotel.id === undefined || !window.confirm(`Delete “${hotel.name}”?`)) return
  await db.hotels.delete(hotel.id)
  await loadHotels()
}

function hotelLandmark(location: HotelLocation) {
  return location === 'Makkah' ? 'Haram' : 'Masjid-e-Nabawi'
}

onMounted(loadHotels)
</script>

<template>
  <div class="app-shell">
    <AppSidebar />

    <main>
      <AppHeader title="Hotel management" />

      <section class="content">
        <div class="section-heading hotel-heading">
          <div>
            <p class="eyebrow">YOUR CATALOGUE</p>
            <h2>Hotels</h2>
            <p>Manage accommodation options for Makkah and Madina.</p>
          </div>
          <button class="primary-button" @click="openCreate"><span>＋</span> Add hotel</button>
        </div>

        <div v-if="loading" class="empty-state">Loading your hotel catalogue…</div>
        <div v-else-if="hotels.length === 0" class="empty-state">
          <div class="empty-icon">▤</div>
          <h3>No hotels yet</h3>
          <p>Add your first accommodation option for an Umrah package.</p>
          <button class="text-button" @click="openCreate">Add your first hotel →</button>
        </div>
        <div v-else class="visa-grid">
          <article v-for="hotel in hotels" :key="hotel.id" class="visa-card hotel-card">
            <div class="card-head">
              <div class="visa-symbol">▤</div>
              <div>
                <h3>{{ hotel.name }}</h3>
                <p>{{ hotel.location }} · {{ hotel.umrahDays }} days</p>
              </div>
              <div class="card-actions"><button @click="openEdit(hotel)">Edit</button><button class="danger"
                  @click="removeHotel(hotel)">Delete</button></div>
            </div>
            <div class="hotel-facts">
              <div><span>SHARING</span><strong>{{ hotel.sharingType }}</strong></div>
              <div><span>DISTANCE</span><strong>{{ hotel.distanceMeters }}m from {{ hotelLandmark(hotel.location)
                  }}</strong></div>
              <div><span>TRANSPORT</span><strong>{{ hotel.transportationIncluded ? 'Included' : 'Not included'
                  }}</strong></div>
            </div>
            <div class="hotel-price"><span>PACKAGE PRICE</span><strong>{{ formatSar(hotel.priceSAR) }}</strong></div>
          </article>
        </div>
      </section>
    </main>

    <div v-if="showForm" class="modal-backdrop">
      <form class="modal" @submit.prevent="saveHotel">
        <div class="modal-head">
          <div>
            <p class="eyebrow">HOTEL DETAILS</p>
            <h2>{{ isEditing ? 'Edit hotel' : 'Add a new hotel' }}</h2>
          </div><button type="button" class="close-button" @click="closeForm">×</button>
        </div>
        <label>Hotel name<input v-model="form.name" autofocus placeholder="e.g. Swissotel Makkah" required /></label>
        <div class="form-row">
          <label>Location<select v-model="form.location">
              <option>Makkah</option>
              <option>Madina</option>
            </select></label>
          <label>Umrah stay (days)<input v-model.number="form.umrahDays" min="1" type="number" required /></label>
        </div>
        <div class="form-row">
          <label>Room sharing<select v-model="form.sharingType">
              <option>Quint</option>
              <option>Quad</option>
              <option>Triple</option>
              <option>Double Bed</option>
            </select></label>
          <label>Distance from {{ landmark }} (meters)<input v-model.number="form.distanceMeters" min="0" type="number"
              required /></label>
        </div>
        <label>Price (SAR)<input v-model.number="form.priceSAR" min="0" step="0.01" type="number" required /></label>
        <label class="checkbox-label"><input v-model="form.transportationIncluded"
            type="checkbox" /><span><strong>Transportation included</strong><small>Transport is included in this hotel
              package.</small></span></label>
        <p class="form-hint">Prices are stored in SAR and converted for display using the saved exchange rate.</p>
        <p v-if="errorMessage" class="form-error">{{ errorMessage }}</p>
        <div class="modal-actions"><button type="button" class="secondary-button"
            @click="closeForm">Cancel</button><button class="primary-button" :disabled="saving">{{ saving ? 'Saving…' :
              isEditing ? 'Save changes' : 'Create hotel' }}</button></div>
      </form>
    </div>
  </div>
</template>
