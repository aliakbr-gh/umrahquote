<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import AppHeader from '../components/AppHeader.vue'
import AppSidebar from '../components/AppSidebar.vue'
import { useCurrency } from '../composables/useCurrency'
import { db, type Ticket } from '../db'

const { formatSar } = useCurrency()
const tickets = ref<Ticket[]>([])
const loading = ref(true)
const saving = ref(false)
const showForm = ref(false)
const editingId = ref<number | null>(null)
const errorMessage = ref('')

type TicketForm = {
  origin: string
  destination: string
  adultPriceSAR: number | null
  childPriceSAR: number | null
  infantPriceSAR: number | null
}

const emptyForm = (): TicketForm => ({
  origin: '',
  destination: '',
  adultPriceSAR: null,
  childPriceSAR: null,
  infantPriceSAR: null,
})
const form = reactive<TicketForm>(emptyForm())
const isEditing = computed(() => editingId.value !== null)

async function loadTickets() {
  loading.value = true
  tickets.value = await db.tickets.orderBy('updatedAt').reverse().toArray()
  loading.value = false
}

function openCreate() {
  editingId.value = null
  Object.assign(form, emptyForm())
  errorMessage.value = ''
  showForm.value = true
}

function openEdit(ticket: Ticket) {
  editingId.value = ticket.id ?? null
  Object.assign(form, {
    origin: ticket.origin,
    destination: ticket.destination,
    adultPriceSAR: ticket.adultPriceSAR,
    childPriceSAR: ticket.childPriceSAR,
    infantPriceSAR: ticket.infantPriceSAR,
  })
  errorMessage.value = ''
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  editingId.value = null
}

async function saveTicket() {
  errorMessage.value = ''
  const origin = form.origin.trim()
  const destination = form.destination.trim()
  if (!origin || !destination) {
    errorMessage.value = 'Enter both origin and destination.'
    return
  }
  if (origin.toLocaleLowerCase() === destination.toLocaleLowerCase()) {
    errorMessage.value = 'Origin and destination must be different.'
    return
  }
  const prices = [form.adultPriceSAR, form.childPriceSAR, form.infantPriceSAR]
  if (prices.some((price) => price === null || price < 0)) {
    errorMessage.value = 'Enter every ticket price. Prices cannot be negative.'
    return
  }

  saving.value = true
  const now = new Date().toISOString()
  const record = {
    origin,
    destination,
    adultPriceSAR: Number(form.adultPriceSAR),
    childPriceSAR: Number(form.childPriceSAR),
    infantPriceSAR: Number(form.infantPriceSAR),
    updatedAt: now,
  }
  if (editingId.value !== null) await db.tickets.update(editingId.value, record)
  else await db.tickets.add({ ...record, createdAt: now })
  await loadTickets()
  saving.value = false
  closeForm()
}

async function removeTicket(ticket: Ticket) {
  if (ticket.id === undefined || !window.confirm(`Delete ${ticket.origin} to ${ticket.destination}?`)) return
  await db.tickets.delete(ticket.id)
  await loadTickets()
}

onMounted(loadTickets)
</script>

<template>
  <div class="app-shell">
    <AppSidebar />
    <main>
      <AppHeader title="Ticket management" />
      <section class="content">
        <div class="section-heading hotel-heading">
          <div><p class="eyebrow">YOUR CATALOGUE</p><h2>Flight tickets</h2><p>Manage routes and traveller ticket prices used in quotations.</p></div>
          <button class="primary-button" @click="openCreate"><span>＋</span> Add ticket</button>
        </div>

        <div v-if="loading" class="empty-state">Loading your ticket catalogue…</div>
        <div v-else-if="tickets.length === 0" class="empty-state">
          <div class="empty-icon">✈</div><h3>No ticket routes yet</h3><p>Add your first route with separate traveller prices.</p>
          <button class="text-button" @click="openCreate">Add your first ticket →</button>
        </div>
        <div v-else class="visa-grid">
          <article v-for="ticket in tickets" :key="ticket.id" class="visa-card ticket-card">
            <div class="card-head">
              <div class="visa-symbol ticket-symbol">✈</div>
              <div class="ticket-route"><h3>{{ ticket.origin }} <span>→</span> {{ ticket.destination }}</h3><p>Per traveller ticket price</p></div>
              <div class="card-actions"><button @click="openEdit(ticket)">Edit</button><button class="danger" @click="removeTicket(ticket)">Delete</button></div>
            </div>
            <div class="prices">
              <div><span>ADULT</span><strong>{{ formatSar(ticket.adultPriceSAR) }}</strong></div>
              <div><span>CHILD</span><strong>{{ formatSar(ticket.childPriceSAR) }}</strong></div>
              <div><span>INFANT</span><strong>{{ formatSar(ticket.infantPriceSAR) }}</strong></div>
            </div>
          </article>
        </div>
      </section>
    </main>

    <div v-if="showForm" class="modal-backdrop">
      <form class="modal" @submit.prevent="saveTicket">
        <div class="modal-head"><div><p class="eyebrow">TICKET DETAILS</p><h2>{{ isEditing ? 'Edit ticket' : 'Add a new ticket' }}</h2></div><button type="button" class="close-button" @click="closeForm">×</button></div>
        <div class="form-row">
          <label>Origin<input v-model="form.origin" autofocus placeholder="e.g. Karachi (KHI)" required /></label>
          <label>Destination<input v-model="form.destination" placeholder="e.g. Jeddah (JED)" required /></label>
        </div>
        <div class="form-prices">
          <label>Adult price (SAR)<input v-model.number="form.adultPriceSAR" min="0" step="0.01" type="number" required /></label>
          <label>Child price (SAR)<input v-model.number="form.childPriceSAR" min="0" step="0.01" type="number" required /></label>
          <label>Infant price (SAR)<input v-model.number="form.infantPriceSAR" min="0" step="0.01" type="number" required /></label>
        </div>
        <p class="form-hint">Prices are stored in SAR and converted for display using the saved exchange rate.</p>
        <p v-if="errorMessage" class="form-error">{{ errorMessage }}</p>
        <div class="modal-actions"><button type="button" class="secondary-button" @click="closeForm">Cancel</button><button class="primary-button" :disabled="saving">{{ saving ? 'Saving…' : isEditing ? 'Save changes' : 'Create ticket' }}</button></div>
      </form>
    </div>
  </div>
</template>
