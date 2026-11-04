import express from 'express';
import {authUser} from '../middleware/authmiddleware.js';
import { getRecommendedUsers ,getMyfriends,sendFriendRequest, acceptFriendRequest, rejectFriendRequest, getOutgoingFriendRequest, getFriendRequest} from '../controllers/userControllers.js';


const userRouter = express.Router();

//protected route to get recommended users
userRouter.use(authUser); // Apply the authUser middleware to all routes in this router


userRouter.get('/', getRecommendedUsers); // Get recommended users) 
userRouter.get('/friends', getMyfriends); // Get my friends
userRouter.post('/friend-request/:id', sendFriendRequest); // Send a friend request
userRouter.post('/friend-request/:requestId/accept', acceptFriendRequest);
userRouter.post('/friend-request/:requestId/reject', rejectFriendRequest);
userRouter.post('/friend-request', getFriendRequest); //get request ka leya 
userRouter.post('/friend-request/outgoing', getOutgoingFriendRequest);//outgoing ka leya 

export default userRouter;