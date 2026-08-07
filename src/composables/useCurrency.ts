import { computed, onMounted, ref } from 'vue'

export type Currency = 'SAR' | 'PKR'

const CURRENCY_KEY = 'umrahquote:currency'
const RATE_KEY = 'umrahquote:sar-pkr-rate'
const RATE_UPDATED_KEY = 'umrahquote:sar-pkr-rate-updated'
const RATE_URL = 'https://2024-03-06.currency-api.pages.dev/v1/currencies/sar.json'
const FALLBACK_RATE = 74.5
const CACHE_TTL = 12 * 60 * 60 * 1000

const currency = ref<Currency>((localStorage.getItem(CURRENCY_KEY) as Currency) || 'SAR')
const rate = ref(Number(localStorage.getItem(RATE_KEY)) || FALLBACK_RATE)
const rateUpdatedAt = ref(localStorage.getItem(RATE_UPDATED_KEY) || '')
const isSyncing = ref(false)
const syncError = ref('')

export function useCurrency() {
  const formatter = computed(
    () =>
      new Intl.NumberFormat(currency.value === 'PKR' ? 'en-PK' : 'en-SA', {
        style: 'currency',
        currency: currency.value,
        maximumFractionDigits: currency.value === 'PKR' ? 0 : 2,
      }),
  )

  function setCurrency(value: Currency) {
    currency.value = value
    localStorage.setItem(CURRENCY_KEY, value)
  }

  function convertFromSar(amount: number) {
    return currency.value === 'SAR' ? amount : amount * rate.value
  }

  function formatSar(amount: number) {
    return formatter.value.format(convertFromSar(amount))
  }

  async function syncRate(force = false) {
    const lastUpdate = Date.parse(rateUpdatedAt.value)
    if (!force && lastUpdate && Date.now() - lastUpdate < CACHE_TTL) return

    isSyncing.value = true
    syncError.value = ''
    try {
      const response = await fetch(RATE_URL)
      if (!response.ok) throw new Error('Rate service is unavailable')
      const data = (await response.json()) as { sar?: { pkr?: number } }
      const nextRate = data.sar?.pkr
      if (!nextRate || !Number.isFinite(nextRate)) throw new Error('Invalid exchange rate')

      const timestamp = new Date().toISOString()
      rate.value = nextRate
      rateUpdatedAt.value = timestamp
      localStorage.setItem(RATE_KEY, String(nextRate))
      localStorage.setItem(RATE_UPDATED_KEY, timestamp)
    } catch {
      syncError.value = 'Using the last saved exchange rate.'
    } finally {
      isSyncing.value = false
    }
  }

  onMounted(() => syncRate())

  return {
    currency,
    rate,
    rateUpdatedAt,
    isSyncing,
    syncError,
    setCurrency,
    formatSar,
    syncRate,
  }
}
