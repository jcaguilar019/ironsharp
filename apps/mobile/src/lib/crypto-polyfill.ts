import "react-native-get-random-values";
import * as ExpoCrypto from "expo-crypto";

const g = globalThis as any;
if (!g.crypto) g.crypto = {};
if (!g.crypto.randomUUID) g.crypto.randomUUID = () => ExpoCrypto.randomUUID();
