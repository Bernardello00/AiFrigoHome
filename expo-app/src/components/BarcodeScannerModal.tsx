import { CameraView } from 'expo-camera';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  visible: boolean;
  onClose: () => void;
  onDetected: (value: string) => void;
};

export function BarcodeScannerModal({ visible, onClose, onDetected }: Props) {
  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        <Text style={styles.title}>Inquadra il barcode</Text>
        <CameraView
          style={styles.camera}
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a'] }}
          onBarcodeScanned={(event) => {
            onDetected(event.data);
            onClose();
          }}
        />
        <Pressable style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeText}>Chiudi</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111', paddingTop: 60 },
  title: { color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  camera: { flex: 1, margin: 12, borderRadius: 16, overflow: 'hidden' },
  closeButton: { backgroundColor: '#fff', margin: 16, padding: 14, borderRadius: 12 },
  closeText: { textAlign: 'center', fontWeight: '700' },
});
