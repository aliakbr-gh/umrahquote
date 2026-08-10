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
export interface Hotel {
  id?: number
  name: string
  location: HotelLocation
  distanceMeters: number
  priceSAR: number
  createdAt: string
  updatedAt: string
}

export interface Ticket {
  id?: number
  origin: string
  destination: string
  adultPriceSAR: number
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
    this.version(5)
      .stores({
        visas: '++id, name, validityDays, createdAt, updatedAt',
        hotels: '++id, name, location, updatedAt',
        tickets: '++id, origin, destination, airline, updatedAt',
      })
    this.version(6)
      .stores({
        visas: '++id, name, validityDays, createdAt, updatedAt',
        hotels: '++id, name, location, updatedAt',
        tickets: '++id, origin, destination, updatedAt',
      })
      .upgrade((transaction) => transaction.table('tickets').toCollection().modify((ticket: Record<string, unknown>) => {
        delete ticket.airline
        delete ticket.fareSource
        delete ticket.childPriceSAR
        delete ticket.infantPriceSAR
      }))
      .upgrade(async (transaction) => {
        await transaction.table('hotels').toCollection().modify((hotel: Record<string, unknown>) => {
          delete hotel.umrahDays
          delete hotel.sharingType
          delete hotel.transportationIncluded
        })
        await transaction.table('tickets').toCollection().modify((ticket: Record<string, unknown>) => {
          ticket.airline ??= 'Airline not specified'
          ticket.fareSource ??= 'manual'
        })
      })
  }
}

export const db = new UmrahQuoteDatabase()
