// This file is for client-side use only and should not import PrismaClient
// Use prisma-server.ts for server-side operations

export const prisma = null; // Placeholder for client-side

// Export for client-side (but won't work)
export const getPrismaClient = () => {
  if (typeof window !== 'undefined') {
    throw new Error('Prisma Client cannot be used on the client side');
  }
  return null;
};