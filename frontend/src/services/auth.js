/**
 * Simple anonymous authentication utility for hackathons.
 * Stores a unique ID in localStorage to keep user history private.
 */

// Simple UUID generator fallback
const generateUUID = () => {
  return "xxxx-xxxx-4xxx-yxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const getUserId = () => {
  if (typeof window === "undefined") return "server-side";
  
  let userId = localStorage.getItem("curalink_user_id");
  
  if (!userId) {
    userId = generateUUID();
    localStorage.setItem("curalink_user_id", userId);
  }
  
  return userId;
};

export const resetUserId = () => {
  localStorage.removeItem("curalink_user_id");
  return getUserId(); // Generate a new one
};
