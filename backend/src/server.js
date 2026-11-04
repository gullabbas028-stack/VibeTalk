import express from 'express';
import "dotenv/config";
import authRouter from './routes/authRoutes.js';
import { connectDB } from './config/db.js';
import cookieParser from 'cookie-parser'; // Import cookie-parser middleware
import userRouter from './routes/userRoutes.js';
import chatRouter from './routes/chatRouter.js';
import notificationRouter from './routes/notificationRoutes.js';
import { startNotificationWorker } from './services/notificationService.js';
import cors from 'cors';

const app = express();//initialize express app hova ha 
const PORT = process.env.PORT || 3000;// Set the port for the server

// middleware ka setup
app.use(cors({
  origin: process.env.CRIENT_URL, //Allow request from client 
  credentials:true, // Allow cookies to send 
}))
app.use(express.json()); // Parse incoming JSON requests
app.use(cookieParser()); //  cookies from  middleware incoming requests

app.use(async (_req, _res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    next(error);
  }
});

app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/chat', chatRouter);
app.use('/api/notifications', notificationRouter);

if (!process.env.VERCEL) {
  await connectDB();
  startNotificationWorker();
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

export default app;
