import mongoose from 'mongoose';

const cacheKey = Symbol.for("vibetalk.mongoose.cache");
const cache = (globalThis[cacheKey] ??= { connection: null, promise: null });

export const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI must be set in the environment");
  }

  if (mongoose.connection.readyState === 1) {
    cache.connection = mongoose.connection;
    return cache.connection;
  }

  if (
    (mongoose.connection.readyState === 0 ||
      mongoose.connection.readyState === 3) &&
    cache.connection
  ) {
    cache.connection = null;
    cache.promise = null;
  }

  if (!cache.promise) {
    cache.promise = mongoose
      .connect(process.env.MONGO_URI, { maxPoolSize: 5 })
      .then((connection) => {
        cache.connection = connection.connection;
        console.info("MongoDB connection established for this function instance.");
        return cache.connection;
      })
      .catch((error) => {
        cache.connection = null;
        cache.promise = null;
        console.error("MongoDB connection failed:", error);
        throw error;
      });
  }

  return cache.promise;
};