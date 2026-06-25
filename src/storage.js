import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'svenska_token';

export const saveToken = (t) => AsyncStorage.setItem(KEY, t);
export const getToken = () => AsyncStorage.getItem(KEY);
export const clearToken = () => AsyncStorage.removeItem(KEY);
