
import {
  ERROR_USER_NOT_FOUND,
  UPDATE_PROFILE_SUCCESS,
  ERROR_RECENT_PLACE_NOT_FOUND,
  SAVE_RECENT_PLACE_SUCCESS,
  REMOVE_RECENT_PLACE_SUCCESS
} from '../constants/user.constant.js';
import { getById, updateUser, addRecentPlaces, getRecentPlaceById, deleteRecentPlaces, getRecentPlaceByUserId } from '../services/user.service.js';

export async function getUser(req, res) {
  const { userId } = req.params;
  if(!userId) {
      return res.status(400).json({ success: false, message: "Missing userId params" });
  }
  let user = await getById(userId);
  if(!user) {
    return res.status(400).json({ success: false, message: ERROR_USER_NOT_FOUND });
  }
  const recentPlaces = await getRecentPlaceByUserId(userId);
  user = {
    ...user,
    recentPlaces: recentPlaces.map(rp=> {
      rp.types = JSON.parse(rp.types);
      return rp;
    })
  }
  delete user.password;
  delete user.currentOtp;
  return res.json({ success: true, data: user });
}

export async function update(req, res) {
  const { userId } = req.params;
  if(!userId) {
      return res.status(400).json({ success: false, message: "Missing userId params" });
  }
  const { firstName, lastName, email, birthDate, phoneNumber, password } = req.body;

  let user;

  try {

    user = await getById(userId);
    if(!user) {
      return res.status(400).json({ success: false, message: ERROR_USER_NOT_FOUND });
    } else {
      user = await updateUser(userId, firstName, lastName, email, birthDate, phoneNumber, password);
    }

    delete user.passwordHash;
    delete user.currentOtp;
    
  } catch (error) {
    if(error.message.includes('duplicate key value violates unique constraint') && error.message.includes('User_Active_Email')) {
      return res.status(400).json({ success: false, message: "Email already used" });
    }
    return res.status(400).json({ success: false, message: error.message });
  }
  
  return res.json({ success: true, data: user, message: UPDATE_PROFILE_SUCCESS });
}

export async function saveRecentPlaces(req, res) {
  const { userId, placeId, name, formattedAddress, lat, lng, types } = req.body;

  let user, recentPlace;

  try {

    user = await getById(userId);
    if(!user) {
      return res.status(400).json({ success: false, message: ERROR_USER_NOT_FOUND });
    } else {
      recentPlace = await addRecentPlaces(userId, placeId, name, formattedAddress, lat, lng, JSON.stringify(types));
    }
    
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
  
  return res.json({ success: true, data: recentPlace, message: SAVE_RECENT_PLACE_SUCCESS });
}

export async function removeRecentPlace(req, res) {
  const { placeId } = req.params;
  if(!placeId) {
      return res.status(400).json({ success: false, message: "Missing placeId params" });
  }

  let recentPlace;

  try {

    recentPlace = await getRecentPlaceById(placeId);
    if(!recentPlace) {
      return res.status(400).json({ success: false, message: ERROR_RECENT_PLACE_NOT_FOUND });
    } else {
      await deleteRecentPlaces(placeId);
    }
    
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
  
  return res.json({ success: true, data: recentPlace, message: REMOVE_RECENT_PLACE_SUCCESS });
}