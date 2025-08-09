# Live Document Scanning Setup

This document describes the implementation of live document scanning using VisionCamera and OCR frame processing.

## What Changed

The `CameraScanScreen` has been converted from a photo-based scanning system to a live scanning system that processes text in real-time using the device's camera.

## Key Features

1. **Live Text Recognition**: Uses VisionCamera with OCR frame processor to detect text in real-time
2. **Visual Scanning Guide**: Green corner markers help users position documents correctly
3. **Real-time Text Display**: Shows detected text at the bottom of the screen
4. **Manual Processing**: Users can manually trigger text processing when they see relevant text
5. **Pause/Resume**: Users can pause and resume scanning with the play/pause button

## Technical Implementation

### Dependencies Added

- `react-native-worklets-core`: Required for frame processors
- `@ismaelmoreiraa/vision-camera-ocr`: OCR frame processor plugin

### Configuration Changes

- Added worklets plugin to `babel.config.js`
- Updated `app.config.ts` to use VisionCamera plugin
- Added worklets import to `App.tsx`

### Key Components

#### Frame Processor

```typescript
const frameProcessor = useFrameProcessor(
  (frame) => {
    "worklet";
    if (!isScanning) return;

    const ocr = scanOCR(frame);
    if (ocr?.result?.text?.length > 3) {
      runOnJS(setLiveText)(ocr.result.text);
    }
  },
  [isScanning]
);
```

#### Camera Component

```typescript
<Camera
  style={StyleSheet.absoluteFill}
  device={device}
  isActive={isScanning}
  frameProcessor={frameProcessor}
  pixelFormat="yuv"
/>
```

## Usage Instructions

1. **Grant Camera Permission**: The app will request camera permission on first use
2. **Position Document**: Hold the document within the green corner markers
3. **Wait for Text Detection**: The app will display detected text at the bottom
4. **Process Text**: Tap "Process Text" when relevant patient information is detected
5. **Review Results**: The extracted patient data will be displayed in a card
6. **Use Data**: Tap "Use This Data" to save and return to the previous screen

## Development Notes

### Building for Development

```bash
# Clean prebuild
npx expo prebuild --clean

# Run on Android
npx expo run:android

# Run on iOS
npx expo run:ios
```

### Common Issues

1. **Frame Processors Unavailable**: Ensure `react-native-worklets-core` is installed and the babel plugin is configured
2. **Camera Permission**: Make sure the VisionCamera plugin is properly configured in `app.config.ts`
3. **Dev Client Required**: This feature requires a development build, not Expo Go

### Performance Considerations

- Frame processing runs on a separate thread for optimal performance
- Text updates are throttled to avoid excessive UI updates
- Scanning can be paused to reduce CPU usage

## Future Enhancements

- Add bounding box visualization for detected text blocks
- Implement automatic patient data detection without manual processing
- Add support for different document types and layouts
- Implement confidence scoring for better accuracy
