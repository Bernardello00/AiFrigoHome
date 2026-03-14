import SwiftUI

#if canImport(VisionKit)
import AVFoundation
import VisionKit

struct BarcodeScannerView: UIViewControllerRepresentable {
    @Environment(\.dismiss) private var dismiss
    let onScanned: (String) -> Void

    func makeUIViewController(context: Context) -> DataScannerViewController {
        let types: Set<DataScannerViewController.RecognizedDataType> = [.barcode()]
        let controller = DataScannerViewController(
            recognizedDataTypes: types,
            qualityLevel: .balanced,
            recognizesMultipleItems: false,
            isGuidanceEnabled: true,
            isHighlightingEnabled: true
        )
        controller.delegate = context.coordinator
        try? controller.startScanning()
        return controller
    }

    func updateUIViewController(_: DataScannerViewController, context _: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(onScanned: onScanned, dismiss: dismiss)
    }

    final class Coordinator: NSObject, DataScannerViewControllerDelegate {
        private let onScanned: (String) -> Void
        private let dismiss: DismissAction

        init(onScanned: @escaping (String) -> Void, dismiss: DismissAction) {
            self.onScanned = onScanned
            self.dismiss = dismiss
        }

        func dataScanner(_ dataScanner: DataScannerViewController, didTapOn item: RecognizedItem) {
            if case let .barcode(barcode) = item, let value = barcode.payloadStringValue {
                onScanned(value)
                try? dataScanner.stopScanning()
                dismiss()
            }
        }
    }
}

#else

struct BarcodeScannerView: View {
    let onScanned: (String) -> Void

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "barcode.viewfinder")
                .font(.largeTitle)
            Text("Scanner barcode non disponibile su questo dispositivo.")
                .multilineTextAlignment(.center)
            Button("Chiudi") {
                onScanned("")
            }
        }
        .padding()
    }
}

#endif
