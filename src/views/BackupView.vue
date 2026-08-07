<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppHeader from '../components/AppHeader.vue'
import AppSidebar from '../components/AppSidebar.vue'
import { db, type Hotel, type Ticket, type Visa } from '../db'

type BackupFile = {
  app: 'UmrahQuote'
  version: number
  exportedAt: string
  data: {
    visas: Visa[]
    hotels: Hotel[]
    tickets: Ticket[]
  }
}

const visaCount = ref(0)
const hotelCount = ref(0)
const ticketCount = ref(0)
const selectedBackup = ref<BackupFile | null>(null)
const selectedFileName = ref('')
const importError = ref('')
const importSuccess = ref('')
const importing = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const totalRecords = computed(() => visaCount.value + hotelCount.value + ticketCount.value)
const selectedTotal = computed(() =>
  selectedBackup.value
    ? selectedBackup.value.data.visas.length + selectedBackup.value.data.hotels.length + selectedBackup.value.data.tickets.length
    : 0,
)

async function refreshCounts() {
  ;[visaCount.value, hotelCount.value, ticketCount.value] = await Promise.all([
    db.visas.count(), db.hotels.count(), db.tickets.count(),
  ])
}

async function exportBackup() {
  importSuccess.value = ''
  const [visas, hotels, tickets] = await Promise.all([
    db.visas.toArray(), db.hotels.toArray(), db.tickets.toArray(),
  ])
  const backup: BackupFile = {
    app: 'UmrahQuote',
    version: 1,
    exportedAt: new Date().toISOString(),
    data: { visas, hotels, tickets },
  }
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const date = new Date().toISOString().slice(0, 10)
  link.href = url
  link.download = `umrahquote-backup-${date}.json`
  link.click()
  URL.revokeObjectURL(url)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function validateBackup(value: unknown): value is BackupFile {
  if (!isRecord(value) || value.app !== 'UmrahQuote' || !isRecord(value.data)) return false
  if (!Array.isArray(value.data.visas) || !Array.isArray(value.data.hotels) || !Array.isArray(value.data.tickets)) return false

  const validVisas = value.data.visas.every(
    (item) =>
      isRecord(item) &&
      typeof item.name === 'string' &&
      typeof item.validityDays === 'number' &&
      typeof item.adultPriceSAR === 'number' &&
      typeof item.childPriceSAR === 'number' &&
      typeof item.infantPriceSAR === 'number',
  )
  const validHotels = value.data.hotels.every(
    (item) =>
      isRecord(item) &&
      typeof item.name === 'string' &&
      (item.location === 'Makkah' || item.location === 'Madina') &&
      typeof item.umrahDays === 'number' &&
      typeof item.distanceMeters === 'number' &&
      typeof item.priceSAR === 'number' &&
      typeof item.transportationIncluded === 'boolean',
  )
  const validTickets = value.data.tickets.every(
    (item) =>
      isRecord(item) && typeof item.origin === 'string' && typeof item.destination === 'string' &&
      typeof item.adultPriceSAR === 'number' && typeof item.childPriceSAR === 'number' &&
      typeof item.infantPriceSAR === 'number',
  )
  return validVisas && validHotels && validTickets
}

async function selectFile(event: Event) {
  importError.value = ''
  importSuccess.value = ''
  selectedBackup.value = null
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  try {
    const parsed: unknown = JSON.parse(await file.text())
    if (!validateBackup(parsed)) throw new Error('This is not a valid UmrahQuote backup file.')
    selectedBackup.value = parsed
    selectedFileName.value = file.name
  } catch (error) {
    selectedFileName.value = ''
    importError.value = error instanceof Error ? error.message : 'The backup file could not be read.'
  }
}

function cancelImport() {
  selectedBackup.value = null
  selectedFileName.value = ''
  importError.value = ''
  if (fileInput.value) fileInput.value.value = ''
}

async function restoreBackup() {
  if (!selectedBackup.value) return
  const confirmed = window.confirm(
    `Replace the current ${totalRecords.value} records with ${selectedTotal.value} records from this backup?`,
  )
  if (!confirmed) return

  importing.value = true
  importError.value = ''
  try {
    const backup = selectedBackup.value
    await db.transaction('rw', [db.visas, db.hotels, db.tickets], async () => {
      await Promise.all([db.visas.clear(), db.hotels.clear(), db.tickets.clear()])
      if (backup.data.visas.length) await db.visas.bulkAdd(backup.data.visas)
      if (backup.data.hotels.length) await db.hotels.bulkAdd(backup.data.hotels)
      if (backup.data.tickets.length) await db.tickets.bulkAdd(backup.data.tickets)
    })
    await refreshCounts()
    cancelImport()
    importSuccess.value = 'Backup imported successfully. Your local database has been restored.'
  } catch {
    importError.value = 'Import failed. Your existing data was not changed.'
  } finally {
    importing.value = false
  }
}

onMounted(refreshCounts)
</script>

<template>
  <div class="app-shell">
    <AppSidebar />
    <main>
      <AppHeader title="Backup & import" />
      <section class="content backup-content">
        <div class="section-heading hotel-heading">
          <div><p class="eyebrow">DATA MANAGEMENT</p><h2>Protect your catalogue</h2><p>Download or restore all data stored locally in this browser.</p></div>
        </div>

        <div class="backup-summary">
          <div><span>VISA RECORDS</span><strong>{{ visaCount }}</strong></div>
          <div><span>HOTEL RECORDS</span><strong>{{ hotelCount }}</strong></div>
          <div><span>TICKET RECORDS</span><strong>{{ ticketCount }}</strong></div>
          <div><span>TOTAL RECORDS</span><strong>{{ totalRecords }}</strong></div>
        </div>

        <div class="backup-grid">
          <article class="backup-card">
            <div class="backup-icon">↓</div>
            <p class="eyebrow">EXPORT</p>
            <h3>Download a backup</h3>
            <p>Save visas and hotels as a portable JSON file. Keep it somewhere safe.</p>
            <button class="primary-button" @click="exportBackup">Download all data</button>
          </article>

          <article class="backup-card">
            <div class="backup-icon import">↑</div>
            <p class="eyebrow">IMPORT</p>
            <h3>Restore from a backup</h3>
            <p>Choose an UmrahQuote JSON backup. Importing will replace all current records.</p>
            <label class="file-picker">
              <input ref="fileInput" accept="application/json,.json" type="file" @change="selectFile" />
              Choose backup file
            </label>
          </article>
        </div>

        <div v-if="selectedBackup" class="import-preview">
          <div><p class="eyebrow">READY TO IMPORT</p><h3>{{ selectedFileName }}</h3><p>{{ selectedBackup.data.visas.length }} visas · {{ selectedBackup.data.hotels.length }} hotels · {{ selectedBackup.data.tickets.length }} tickets · Exported {{ new Date(selectedBackup.exportedAt).toLocaleString('en-PK') }}</p></div>
          <div class="preview-actions"><button class="secondary-button" @click="cancelImport">Cancel</button><button class="primary-button" :disabled="importing" @click="restoreBackup">{{ importing ? 'Importing…' : 'Replace & import' }}</button></div>
        </div>
        <p v-if="importError" class="form-error backup-message">{{ importError }}</p>
        <p v-if="importSuccess" class="success-message">{{ importSuccess }}</p>

        <div class="safety-note"><strong>Local data only</strong><p>Nothing is uploaded to a server. Exported files contain your catalogue data, so store them securely.</p></div>
      </section>
    </main>
  </div>
</template>
