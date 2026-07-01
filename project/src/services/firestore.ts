import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Query,
  QueryConstraint,
} from 'firebase/firestore'
import { db } from '@/config/firebase'

export class FirestoreService<T extends { id?: string }> {
  constructor(private collectionName: string) {}

  async create(data: Omit<T, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, this.collectionName), {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    return docRef.id
  }

  async read(id: string): Promise<T | null> {
    const docRef = doc(db, this.collectionName, id)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as T
    }
    return null
  }

  async readAll(): Promise<T[]> {
    const querySnapshot = await getDocs(collection(db, this.collectionName))
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as T))
  }

  async query(constraints: QueryConstraint[]): Promise<T[]> {
    const q = query(collection(db, this.collectionName), ...constraints)
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as T))
  }

  async update(id: string, data: Partial<T>): Promise<void> {
    const docRef = doc(db, this.collectionName, id)
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date(),
    })
  }

  async delete(id: string): Promise<void> {
    const docRef = doc(db, this.collectionName, id)
    await deleteDoc(docRef)
  }
}

// Specific service instances
export const bookingService = new FirestoreService('bookings')
export const jobService = new FirestoreService('jobs')
export const customerService = new FirestoreService('customers')
export const driverService = new FirestoreService('drivers')
export const vehicleService = new FirestoreService('vehicles')
export const documentService = new FirestoreService('documents')
export const billService = new FirestoreService('bills')
