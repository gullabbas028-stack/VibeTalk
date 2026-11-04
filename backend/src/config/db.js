import mongoose from 'mongoose';

let connectionPromise;

export const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI must be set in the environment");
  }

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(process.env.MONGO_URI)
      .then((connection) => {
        console.log(`MongoDB connected: ${connection.connection.host}`);
        return connection.connection;
      })
      .catch((error) => {
        connectionPromise = undefined;
        console.error("MongoDB connection failed:", error);
        throw error;
      });
  }

  return connectionPromise;
};