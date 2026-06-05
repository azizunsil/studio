'use client';

export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write' | 'read';
  requestResourceData?: any;
};

/**
 * Error class umum untuk menangani masalah izin akses di Firebase (RTDB/Firestore).
 */
export class FirebasePermissionError extends Error {
  context: SecurityRuleContext;

  constructor(context: SecurityRuleContext) {
    const message = `FirebaseError: Missing or insufficient permissions: The following request was denied by Security Rules:
{
  "method": "${context.operation}",
  "path": "${context.path}"
}`;
    super(message);
    this.name = 'FirebasePermissionError';
    this.context = context;
  }
}
