export type FoodItem = {
  id: string;
  name: string;
  quantity: string;
  expirationDate: string;
};

export type UserProfile = {
  householdName: string;
  householdMembers: number;
  dietStyle: 'Onnivora' | 'Vegetariana' | 'Vegana' | 'Pescetariana';
  allergies: string;
};
