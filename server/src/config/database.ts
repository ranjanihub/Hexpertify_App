/**
 * The one Hexpertify database. Every part of the platform (the API, the website's Prisma client and the
 * maintenance scripts) connects here; MONGODB_URI may override it for a separate environment.
 * Kept free of other imports so the website can read it without loading the rest of the API config.
 */
export const COMMON_MONGODB_URI =
  'mongodb+srv://ranjaniranjani5694_db_user:1kCjOE72je4p0CFU@cluster0.ibhuunq.mongodb.net/hexpertify?retryWrites=true&w=majority';

export const mongodbUri = process.env.MONGODB_URI || COMMON_MONGODB_URI;

export const dbName = process.env.DB_NAME || 'hexpertify';
