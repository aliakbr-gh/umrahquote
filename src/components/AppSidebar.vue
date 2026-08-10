<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { db, type Hotel, type Ticket, type Visa } from '../db'

const router = useRouter()
const seeding = ref(false)

async function importTestData() {
  if (!window.confirm('Delete all current data and replace it with realistic test data?')) return
  seeding.value = true
  const now = new Date().toISOString()
  const visas: Visa[] = [
    { name: 'Standard Umrah Visa', validityDays: 30, adultPriceSAR: 480, childPriceSAR: 350, infantPriceSAR: 180, createdAt: now, updatedAt: now },
    { name: 'Premium Umrah Visa', validityDays: 90, adultPriceSAR: 650, childPriceSAR: 480, infantPriceSAR: 220, createdAt: now, updatedAt: now },
  ]
  const hotels: Hotel[] = [
    { name: 'Swissotel Al Maqam', location: 'Makkah', distanceMeters: 150, priceSAR: 925, createdAt: now, updatedAt: now },
    { name: 'Emaar Grand Hotel', location: 'Makkah', distanceMeters: 750, priceSAR: 475, createdAt: now, updatedAt: now },
    { name: 'Anwar Al Madinah Mövenpick', location: 'Madina', distanceMeters: 120, priceSAR: 875, createdAt: now, updatedAt: now },
    { name: 'Saja Al Madinah', location: 'Madina', distanceMeters: 500, priceSAR: 550, createdAt: now, updatedAt: now },
  ]
  const pakistanOrigins = [
    ['Karachi (KHI)', 1650], ['Islamabad (ISB)', 1920], ['Lahore (LHE)', 1780], ['Multan (MUX)', 1740],
  ] as const
  const saudiDestinations = ['Jeddah (JED)', 'Madina (MED)'] as const
  const tickets: Ticket[] = pakistanOrigins.flatMap(([origin, baseFare]) =>
    saudiDestinations.flatMap((destination) => {
      const fare = baseFare + (destination === 'Madina (MED)' ? 90 : 0)
      return [
        { origin, destination, adultPriceSAR: fare, childPriceSAR: fare * 0.8, infantPriceSAR: fare * 0.2, createdAt: now, updatedAt: now },
        { origin: destination, destination: origin, adultPriceSAR: fare, childPriceSAR: fare * 0.8, infantPriceSAR: fare * 0.2, createdAt: now, updatedAt: now },
      ]
    }),
  )
  try {
    await db.transaction('rw', [db.visas, db.hotels, db.tickets], async () => {
      await Promise.all([db.visas.clear(), db.hotels.clear(), db.tickets.clear()])
      await Promise.all([db.visas.bulkAdd(visas), db.hotels.bulkAdd(hotels), db.tickets.bulkAdd(tickets)])
    })
    window.dispatchEvent(new Event('umrahquote:data-reset'))
    await router.push('/dashboard')
  } finally {
    seeding.value = false
  }
}
</script>

<template>
  <aside class="sidebar">
    <div class="brand"><span class="brand-mark">U</span><span>UmrahQuote</span></div>
    <nav>
      <RouterLink class="nav-item" to="/dashboard"><span>⌂</span> Dashboard</RouterLink>
      <RouterLink class="nav-item" to="/visas"><span>▣</span> Visa</RouterLink>
      <RouterLink class="nav-item" to="/hotels"><span>▤</span> Hotels</RouterLink>
      <RouterLink class="nav-item" to="/tickets"><span>✈</span> Tickets</RouterLink>
      <RouterLink class="nav-item" to="/exchange-rate"><span>₨</span> Exchange rate</RouterLink>
      <RouterLink class="nav-item" to="/backup"><span>▧</span> Backup &amp; import</RouterLink>
      <button class="nav-item seed-button" :disabled="seeding" @click="importTestData"><span>✦</span> {{ seeding ? 'Importing…' : 'Import test data' }}</button>
    </nav>
    <div class="local-note">
      <span>●</span>
      <div>
        <strong>Local-first storage</strong>
        <p>Your records stay in this browser.</p>
      </div>
    </div>
  </aside>
</template>
