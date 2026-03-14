import { BarcodeScannerModal } from '@/components/BarcodeScannerModal';
import { askRecipeAI } from '@/services/aiService';
import { requestNotificationsPermission, scheduleExpiryNotifications } from '@/services/notifications';
import { defaultProfile, loadItems, loadProfile, saveItems, saveProfile } from '@/storage/fridgeStorage';
import { FoodItem, UserProfile } from '@/types';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Camera } from 'expo-camera';

export default function HomeScreen() {
  const [items, setItems] = useState<FoodItem[]>([]);
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [expirationDate, setExpirationDate] = useState('2026-12-31');
  const [aiText, setAiText] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);

  useEffect(() => {
    (async () => {
      const [storedItems, storedProfile] = await Promise.all([loadItems(), loadProfile()]);
      setItems(storedItems);
      setProfile(storedProfile);
      await requestNotificationsPermission();
      const cam = await Camera.requestCameraPermissionsAsync();
      if (cam.status !== 'granted') {
        Alert.alert('Permesso fotocamera', 'Concedi il permesso per usare lo scanner barcode.');
      }
    })();
  }, []);

  const expiringCount = useMemo(
    () => items.filter((i) => new Date(i.expirationDate).getTime() < Date.now() + 3 * 24 * 3600 * 1000).length,
    [items],
  );

  const addItem = async () => {
    if (!name.trim()) return;
    const next = [
      ...items,
      {
        id: Math.random().toString(36).slice(2),
        name: name.trim(),
        quantity: quantity.trim() || '1',
        expirationDate,
      },
    ].sort((a, b) => +new Date(a.expirationDate) - +new Date(b.expirationDate));

    setItems(next);
    await saveItems(next);
    await scheduleExpiryNotifications(next);
    setName('');
    setQuantity('1');
  };

  const removeItem = async (id: string) => {
    const next = items.filter((i) => i.id !== id);
    setItems(next);
    await saveItems(next);
    await scheduleExpiryNotifications(next);
  };

  const runAI = async () => {
    try {
      setLoadingAI(true);
      const result = await askRecipeAI(items, profile);
      setAiText(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Errore sconosciuto';
      Alert.alert('Errore AI', message);
    } finally {
      setLoadingAI(false);
    }
  };

  const onBarcode = (value: string) => {
    if (!value) return;
    setName(`Prodotto ${value}`);
  };

  const updateProfile = async (patch: Partial<UserProfile>) => {
    const next = { ...profile, ...patch };
    setProfile(next);
    await saveProfile(next);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>AiFrigoHome (Expo)</Text>
        <Text style={styles.subtitle}>In scadenza entro 3 giorni: {expiringCount}</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Aggiungi alimento</Text>
          <TextInput placeholder="Nome alimento" value={name} onChangeText={setName} style={styles.input} />
          <TextInput placeholder="Quantità" value={quantity} onChangeText={setQuantity} style={styles.input} />
          <TextInput
            placeholder="Scadenza YYYY-MM-DD"
            value={expirationDate}
            onChangeText={setExpirationDate}
            style={styles.input}
          />
          <View style={styles.row}>
            <Button title="Scansiona barcode" onPress={() => setScannerVisible(true)} />
            <Button title="Salva" onPress={addItem} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Profilo famiglia</Text>
          <TextInput
            placeholder="Nome casa"
            value={profile.householdName}
            onChangeText={(text) => updateProfile({ householdName: text })}
            style={styles.input}
          />
          <TextInput
            placeholder="Numero componenti"
            value={String(profile.householdMembers)}
            onChangeText={(text) => updateProfile({ householdMembers: Number(text) || 1 })}
            style={styles.input}
            keyboardType="number-pad"
          />
          <TextInput
            placeholder="Dieta (Onnivora/Vegetariana/Vegana/Pescetariana)"
            value={profile.dietStyle}
            onChangeText={(text) => updateProfile({ dietStyle: (text as UserProfile['dietStyle']) || 'Onnivora' })}
            style={styles.input}
          />
          <TextInput
            placeholder="Allergie"
            value={profile.allergies}
            onChangeText={(text) => updateProfile({ allergies: text })}
            style={styles.input}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Frigorifero</Text>
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ListEmptyComponent={<Text>Nessun alimento inserito.</Text>}
            renderItem={({ item }) => (
              <View style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemMeta}>
                    {item.quantity} · scadenza {item.expirationDate}
                  </Text>
                </View>
                <Pressable onPress={() => removeItem(item.id)}>
                  <Text style={styles.delete}>Elimina</Text>
                </Pressable>
              </View>
            )}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Suggerimenti AI</Text>
          <Button title="Genera ricette" onPress={runAI} disabled={!items.length || loadingAI} />
          {loadingAI ? <ActivityIndicator style={{ marginTop: 12 }} /> : null}
          {aiText ? <Text style={styles.aiText}>{aiText}</Text> : null}
        </View>
      </ScrollView>

      <BarcodeScannerModal visible={scannerVisible} onClose={() => setScannerVisible(false)} onDetected={onBarcode} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4f6f8' },
  container: { padding: 16, gap: 12, paddingBottom: 36 },
  title: { fontSize: 28, fontWeight: '800', color: '#111827' },
  subtitle: { color: '#6b7280', marginBottom: 4 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 12, gap: 8 },
  cardTitle: { fontSize: 17, fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  itemName: { fontWeight: '700' },
  itemMeta: { color: '#6b7280', fontSize: 12 },
  delete: { color: '#ef4444', fontWeight: '700' },
  aiText: { marginTop: 10, lineHeight: 21 },
});
