/**
 * @see docs/07_인증_보안_v0.1.md
 */
import * as admin from 'firebase-admin';

let initialized = false;

export function getAdminApp(): admin.app.App {
  if (!initialized) {
    admin.initializeApp();
    initialized = true;
  }
  return admin.app();
}

export function getAdminFirestore() {
  getAdminApp();
  return admin.firestore();
}

export function getAdminAuth() {
  getAdminApp();
  return admin.auth();
}

export function getAdminStorage() {
  getAdminApp();
  return admin.storage();
}

export const FieldValue = admin.firestore.FieldValue;
export const Timestamp = admin.firestore.Timestamp;
