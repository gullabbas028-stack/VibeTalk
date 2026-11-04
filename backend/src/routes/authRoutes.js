import express from 'express';
import { signup, login ,logout ,onboard} from '../controllers/authControllers.js';
import {authUser} from '../middleware/authmiddleware.js';
const authRouter = express.Router();

authRouter.post('/signup',signup);//signup route ko handle karne ke liye signup controller function ko use kar rahe hain
authRouter.post('/login', login);//login route ko handle karne ke liye login controller function ko use kar rahe hain
authRouter.post('/logout', logout);//logout route ko handle karne ke liye logout controller function ko use kar rahe hain
authRouter.post('/onboarding', authUser, onboard);//onboard route ko handle karne ke liye onboard controller function ko use kar rahe hain
authRouter.get('/me', (req, res) => {
  if (!req.cookies?.token) {
    return res.status(200).json({ user: null });
  }

  return authUser(req, res, () => {
    res.status(200).json({
      user: req.user,
    });
  });
});

export default authRouter;
