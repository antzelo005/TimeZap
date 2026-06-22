# TimeZap Frontend

Expo React Native frontend for TimeZap. The same codebase targets web through React Native Web and Android through Expo.

## Tech Stack

- React Native
- Expo
- React Native Web
- TypeScript
- React Navigation
- AsyncStorage
- `react-native-svg`
- Expo Notifications

## Setup

```bash
cd frontend
npm install
```

Start the web app:

```bash
npm run web
```

Start on an Android emulator:

```bash
npm run android
```

Run TypeScript checks:

```bash
npm run typecheck
```

## API URL Behavior

The frontend API base URLs are defined in `src/api/client.ts`:

- Web: `http://localhost:3000/api`
- Android emulator: `http://10.0.2.2:3000/api`

`10.0.2.2` lets the Android emulator reach the backend running on the host machine. Start the backend before running the frontend.

## Notifications

The frontend reads notification records from the backend notification center. Android local reminder scheduling is attempted only where Expo/native platform support is available and permissions are enabled.

## AI Suggestions

The frontend opens the AI Suggestions modal and sends prompts to the backend endpoint. It does not call Gemini directly and never handles `GEMINI_API_KEY`.
