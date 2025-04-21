import * as SQLite from "expo-sqlite"
import { auth } from "../firebase"
import { getFirestore, collection, addDoc, Timestamp } from "firebase/firestore"
import { db as sqliteDb } from "../dbInit";

const firestoreDb = getFirestore()

/**
 * Fetch the full weight history from SQLite for this user.
 */
export async function getWeightHistoryFromSQLite(userId: string): Promise<{ id: string, weight: number, timestamp: Date }[]> {
    try {
      const rows = await sqliteDb.getAllAsync(
        `SELECT id, weight, timestamp 
           FROM weight 
          WHERE user_id = ? 
       ORDER BY datetime(timestamp) ASC;`,
        [userId]
      )
  
      return rows.map((r: any) => ({
        id: r.id,
        weight: r.weight,
        timestamp: new Date(r.timestamp),
      }))
    } catch (err) {
      console.error("Error fetching weight history from SQLite:", err)
      return []
    }
  }

/**
 * Save a new weight entry to both Firestore and SQLite.
 * Returns the Firestore doc ID.
 */
export async function saveWeightToFirestoreAndSQLite(weightValue: number): Promise<string> {
  const user = auth.currentUser
  if (!user) throw new Error("User not authenticated")

  // 1) Firestore
  const docRef = await addDoc(
    collection(firestoreDb, "users", user.uid, "weight"),
    { weight: weightValue, timestamp: Timestamp.now() }
  )

  // 2) SQLite
  const isoTs = new Date().toISOString()
  await sqliteDb.runAsync(
    `INSERT INTO weight (id, user_id, weight, timestamp) VALUES (?, ?, ?, ?);`,
    [docRef.id, user.uid, weightValue, isoTs]
  )

  return docRef.id
}
