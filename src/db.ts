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

class UmrahQuoteDatabase extends Dexie {
  visas!: EntityTable<Visa, 'id'>

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
  }
}

export const db = new UmrahQuoteDatabase()
