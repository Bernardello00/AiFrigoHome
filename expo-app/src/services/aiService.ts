import { FoodItem, UserProfile } from '@/types';

type Message = { role: 'system' | 'user'; content: string };

type ChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

export async function askRecipeAI(items: FoodItem[], profile: UserProfile): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_AI_API_KEY;
  if (!apiKey) {
    throw new Error('Manca EXPO_PUBLIC_AI_API_KEY nel file .env');
  }

  const baseUrl = process.env.EXPO_PUBLIC_AI_BASE_URL ?? 'https://api.openai.com/v1';
  const model = process.env.EXPO_PUBLIC_AI_MODEL ?? 'gpt-4o-mini';

  const ingredients = items.map((i) => `${i.name} (${i.quantity})`).join(', ');
  const expiring = items
    .filter((i) => +new Date(i.expirationDate) <= Date.now() + 3 * 24 * 3600 * 1000)
    .map((i) => i.name)
    .join(', ');

  const messages: Message[] = [
    {
      role: 'system',
      content: 'Sei un nutrizionista pratico orientato alla riduzione sprechi.',
    },
    {
      role: 'user',
      content: `Ingredienti: ${ingredients || 'nessuno'}\nIn scadenza: ${expiring || 'nessuno'}\nProfilo: ${profile.householdName}, ${profile.householdMembers} persone, dieta ${profile.dietStyle}, allergie ${profile.allergies || 'nessuna'}.\nProponi 2 ricette semplici e rapide in italiano.`,
    },
  ];

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, temperature: 0.4 }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Errore AI: ${text}`);
  }

  const json = (await response.json()) as ChatResponse;
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error('Risposta AI non valida');
  return content.trim();
}
