import Dexie, { type EntityTable } from 'dexie'

export interface Visa {
  id?: number
  name: string
  validityDays: number
  adultPriceSAR: number
  childPriceSAR: number
  infantPriceSAR: number
  createdAt: string
  updatedAt: string
}

export type HotelLocation = 'Makkah' | 'Madina'
export type SharingType = 'Quint' | 'Quad' | 'Triple' | 'Double Bed'

export interface Hotel {
  id?: number
  name: string
  location: HotelLocation
  umrahDays: number
  sharingType: SharingType
  distanceMeters: number
  priceSAR: number
  transportationIncluded: boolean
  createdAt: string
  updatedAt: string
}

export interface Ticket {
  id?: number
  origin: string
  destination: string
  adultPriceSAR: number
  childPriceSAR: number
  infantPriceSAR: number
  createdAt: string
  updatedAt: string
}

class UmrahQuoteDatabase extends Dexie {
  visas!: EntityTable<Visa, 'id'>
  hotels!: EntityTable<Hotel, 'id'>
  tickets!: EntityTable<Ticket, 'id'>

  constructor() {
    super('umrah-quote-db')
    this.version(1).stores({
      visas: '++id, name, validityDays, createdAt, updatedAt',
    })
    this.version(2)
      .stores({
        visas: '++id, name, validityDays, createdAt, updatedAt',
      })
      .upgrade((transaction) =>
        transaction
          .table('visas')
          .toCollection()
          .modify((visa: Record<string, unknown>) => {
            visa.adultPriceSAR = visa.adultPriceSar
            visa.childPriceSAR = visa.childPriceSar
            visa.infantPriceSAR = visa.infantPriceSar
            delete visa.adultPriceSar
            delete visa.childPriceSar
            delete visa.infantPriceSar
          }),
      )
    this.version(3).stores({
      visas: '++id, name, validityDays, createdAt, updatedAt',
      hotels: '++id, name, location, sharingType, umrahDays, updatedAt',
    })
    this.version(4).stores({
      visas: '++id, name, validityDays, createdAt, updatedAt',
      hotels: '++id, name, location, sharingType, umrahDays, updatedAt',
      tickets: '++id, origin, destination, updatedAt',
    })
  }
}

export const db = new UmrahQuoteDatabase()
