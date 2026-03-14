import AsyncStorage from '@react-native-async-storage/async-storage';
import { FoodItem, UserProfile } from '@/types';

const ITEMS_KEY = 'fridge_items';
const PROFILE_KEY = 'user_profile';

const defaultProfile: UserProfile = {
  householdName: 'Casa',
  householdMembers: 2,
  dietStyle: 'Onnivora',
  allergies: '',
};

export async function loadItems(): Promise<FoodItem[]> {
  const raw = await AsyncStorage.getItem(ITEMS_KEY);
  if (!raw) return [];
  const parsed = JSON.parse(raw) as FoodItem[];
  return parsed.sort((a, b) => +new Date(a.expirationDate) - +new Date(b.expirationDate));
}

export async function saveItems(items: FoodItem[]): Promise<void> {
  await AsyncStorage.setItem(ITEMS_KEY, JSON.stringify(items));
}

export async function loadProfile(): Promise<UserProfile> {
  const raw = await AsyncStorage.getItem(PROFILE_KEY);
  return raw ? (JSON.parse(raw) as UserProfile) : defaultProfile;
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export { defaultProfile };
