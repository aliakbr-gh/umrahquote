<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { db, type Visa } from '../db'
import { useCurrency } from '../composables/useCurrency'
import AppSidebar from '../components/AppSidebar.vue'
import AppHeader from '../components/AppHeader.vue'

const { formatSar } = useCurrency()

const visas = ref<Visa[]>([])
const loading = ref(true)
const saving = ref(false)
const editingId = ref<number | null>(null)
const errorMessage = ref('')
const showForm = ref(false)

type VisaForm = {
  name: string
  validityDays: number
  adultPriceSAR: number | null
  childPriceSAR: number | null
  infantPriceSAR: number | null
}

const emptyForm = (): VisaForm => ({
  name: '',
  validityDays: 30,
  adultPriceSAR: null,
  childPriceSAR: null,
  infantPriceSAR: null,
})
const form = reactive(emptyForm())

const isEditing = computed(() => editingId.value !== null)

async function loadVisas() {
  loading.value = true
  visas.value = await db.visas.orderBy('updatedAt').reverse().toArray()
  loading.value = false
}

function openCreate() {
  editingId.value = null
  Object.assign(form, emptyForm())
  errorMessage.value = ''
  showForm.value = true
}

function openEdit(visa: Visa) {
  editingId.value = visa.id ?? null
  Object.assign(form, {
    name: visa.name,
    validityDays: visa.validityDays,
    adultPriceSAR: visa.adultPriceSAR,
    childPriceSAR: visa.childPriceSAR,
    infantPriceSAR: visa.infantPriceSAR,
  })
  errorMessage.value = ''
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  editingId.value = null
}

async function saveVisa() {
  errorMessage.value = ''
  if (!form.name.trim()) {
    errorMessage.value = 'Enter a visa name.'
    return
  }
  const prices = [form.adultPriceSAR, form.childPriceSAR, form.infantPriceSAR]
  if (form.validityDays < 1 || prices.some((value) => value === null || value < 0)) {
    errorMessage.value = 'Enter every price. Validity must be at least 1 day and prices cannot be negative.'
    return
  }

  saving.value = true
  const now = new Date().toISOString()
  const record = {
    name: form.name.trim(),
    validityDays: Number(form.validityDays),
    adultPriceSAR: Number(form.adultPriceSAR),
    childPriceSAR: Number(form.childPriceSAR),
    infantPriceSAR: Number(form.infantPriceSAR),
    updatedAt: now,
  }

  if (editingId.value !== null) {
    await db.visas.update(editingId.value, record)
  } else {
    await db.visas.add({ ...record, createdAt: now })
  }
  await loadVisas()
  saving.value = false
  closeForm()
}

async function removeVisa(visa: Visa) {
  if (visa.id === undefined || !window.confirm(`Delete “${visa.name}”?`)) return
  await db.visas.delete(visa.id)
  await loadVisas()
}

onMounted(loadVisas)
</script>

<template>
  <div class="app-shell">
    <AppSidebar />

    <main>
      <AppHeader title="Visa management" />

      <section class="content">
        <div class="section-heading">
          <div>
            <p class="eyebrow">YOUR CATALOGUE</p>
            <h2>Visa types</h2>
            <p>Add and manage the visa options used in quotations.</p>
          </div>
          <button class="primary-button" @click="openCreate"><span>＋</span> Add visa</button>
        </div>

        <div v-if="loading" class="empty-state">Loading your visa catalogue…</div>
        <div v-else-if="visas.length === 0" class="empty-state">
          <div class="empty-icon">▣</div>
          <h3>No visa types yet</h3>
          <p>Create your first visa record with separate traveller prices.</p>
          <button class="text-button" @click="openCreate">Add your first visa →</button>
        </div>
        <div v-else class="visa-grid">
          <article v-for="visa in visas" :key="visa.id" class="visa-card">
            <div class="card-head">
              <div class="visa-symbol">◈</div>
              <div>
                <h3>{{ visa.name }}</h3>
                <p>{{ visa.validityDays }} days validity</p>
              </div>
              <div class="card-actions"><button @click="openEdit(visa)">Edit</button><button class="danger"
                  @click="removeVisa(visa)">Delete</button></div>
            </div>
            <div class="prices">
              <div><span>ADULT</span><strong>{{ formatSar(visa.adultPriceSAR) }}</strong></div>
              <div><span>CHILD</span><strong>{{ formatSar(visa.childPriceSAR) }}</strong></div>
              <div><span>INFANT</span><strong>{{ formatSar(visa.infantPriceSAR) }}</strong></div>
            </div>
          </article>
        </div>
      </section>
    </main>

    <div v-if="showForm" class="modal-backdrop">
      <form class="modal" @submit.prevent="saveVisa">
        <div class="modal-head">
          <div>
            <p class="eyebrow">VISA DETAILS</p>
            <h2>{{ isEditing ? 'Edit visa' : 'Add a new visa' }}</h2>
          </div><button type="button" class="close-button" @click="closeForm">×</button>
        </div>
        <label>Visa name<input v-model="form.name" autofocus placeholder="e.g. Standard Umrah Visa" /></label>
        <label>Validity (days)<input v-model.number="form.validityDays" min="1" type="number" /></label>
        <div class="form-prices">
          <label>Adult price (SAR)<input v-model.number="form.adultPriceSAR" min="0" step="0.01" type="number"
              required /></label>
          <label>Child price (SAR)<input v-model.number="form.childPriceSAR" min="0" step="0.01" type="number"
              required /></label>
          <label>Infant price (SAR)<input v-model.number="form.infantPriceSAR" min="0" step="0.01" type="number"
              required /></label>
        </div>
        <p class="form-hint">Prices are stored in SAR and converted for display using the saved exchange rate.</p>
        <p v-if="errorMessage" class="form-error">{{ errorMessage }}</p>
        <div class="modal-actions"><button type="button" class="secondary-button"
            @click="closeForm">Cancel</button><button class="primary-button" :disabled="saving">{{ saving ? 'Saving…' :
              isEditing ? 'Save changes' : 'Create visa' }}</button></div>
      </form>
    </div>
  </div>
</template>
