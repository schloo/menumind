export const DEV_URL = process.env.EXPO_PUBLIC_DEV_URL || "http://localhost:3000";  // Default fallback
export const PROD_URL = process.env.EXPO_PUBLIC_PROD_URL || "https://menumind-backend-cf4730043d9a.herokuapp.com";

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL || (__DEV__ ? DEV_URL : PROD_URL);

console.log("Using API URL:", API_URL);

export default API_URL;