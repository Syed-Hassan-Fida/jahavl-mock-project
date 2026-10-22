import { SafeAreaProvider } from "react-native-safe-area-context";
import JahApp from "./src/JahApp";

export default function App() {
  return (
    <SafeAreaProvider>
      <JahApp />
    </SafeAreaProvider>
  );
}
