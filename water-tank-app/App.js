import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";

// NOTE: Since you don't have the actual logo file in the environment, 
// I've commented out the logo import to prevent errors.
// import logo from "./assets/images/logo.jpeg"; 

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

const TANK_ID = "tank_01"; 
const PRIMARY_BLUE = "#1976D2"; 
const LIGHT_BLUE = "#BBDEFB";
const BACKGROUND_COLOR = "#E3F2FD";
const DANGER_RED = "#D32F2F";
const SUCCESS_GREEN = "#388E3C";

// Main App
export default function App() {
  const [user, setUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
    });
    return unsub;
  }, []);

  if (!isAuthReady) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={PRIMARY_BLUE} />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BACKGROUND_COLOR }}>
      {user ? (
        <Dashboard onLogout={() => signOut(auth)} />
      ) : (
        <AuthScreen />
      )}
    </SafeAreaView>
  );
}

// Authentication Screen
function AuthScreen() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    if (!email || !pass) {
        setErr("Please enter both email and password.");
        return;
    }
    try {
      setBusy(true);
      setErr("");
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email.trim(), pass);
      } else {
        await createUserWithEmailAndPassword(auth, email.trim(), pass);
      }
    } catch (e) {
      setErr(e.message.includes('auth/') ? e.message.split('auth/')[1].replace(/-\w+/g, ' ').toUpperCase() : "Authentication Error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={s.authContainer}>
      {/* <Image source={logo} style={s.logo} /> */}
      <Text style={s.h1}>Smart Tank Manager</Text>
      <Text style={s.muted}>
        Sign {mode === "login" ? "in" : "up"} to monitor and control your device.
      </Text>

      <TextInput
        style={s.input}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="Email"
        placeholderTextColor="#999"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={s.input}
        secureTextEntry
        placeholder="Password"
        placeholderTextColor="#999"
        value={pass}
        onChangeText={setPass}
      />

      {err ? <Text style={s.err}>{err}</Text> : null}

      <Pressable style={s.btn} onPress={submit} disabled={busy}>
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={s.btnText}>
            {mode === "login" ? "LOG IN" : "CREATE ACCOUNT"}
          </Text>
        )}
      </Pressable>

      <Pressable
        onPress={() => setMode(mode === "login" ? "signup" : "login")}
      >
        <Text style={s.link}>
          {mode === "login"
            ? "Need an account? Sign up"
            : "Have an account? Log in"}
        </Text>
      </Pressable>
    </View>
  );
}

// Dashboard Screen
function Dashboard({ onLogout }) {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggleBusy, setToggleBusy] = useState(false);

  useEffect(() => {
    const ref = doc(db, "tanks", TANK_ID);
    const unsubscribe = onSnapshot(ref, (docSnap) => {
        if (docSnap.exists()) {
             setSnapshot({ id: docSnap.id, ...docSnap.data() }); 
        } else {
             setSnapshot({ id: TANK_ID, level_pct: 0, temperature_c: 0, tds_ppm: 0, pump_on: false });
        }
        setLoading(false);
    }, (error) => {
        console.error("Firestore error:", error);
        setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading || !snapshot) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={PRIMARY_BLUE} />
      </View>
    );
  }

  const level = Number(snapshot.level_pct ?? 0);
  const temp = Number(snapshot.temperature_c ?? 0);
  const tds = Number(snapshot.tds_ppm ?? 0);
  const pumpOn = Boolean(snapshot.pump_on);

  const setPump = async (v) => {
    try {
      setToggleBusy(true);
      await updateDoc(doc(db, "tanks", TANK_ID), { pump_on: v });
    } catch(e) {
      console.error("Update failed:", e);
    } finally {
      setToggleBusy(false);
    }
  };
  
  // Logic for Sensor Statuses
  const getTempStatus = (t) => (t > 30 ? { status: "WARNING: High Temp", color: DANGER_RED, icon: "🔥" } : { status: "Ideal", color: SUCCESS_GREEN, icon: "✅" });
  const getTdsStatus = (t) => (t <= 300 ? { status: "Excellent Quality", color: SUCCESS_GREEN, icon: "💧" } : t <= 600 ? { status: "Acceptable", color: PRIMARY_BLUE, icon: "💡" } : { status: "Poor Quality", color: DANGER_RED, icon: "⚠️" });
  
  const tempStatus = getTempStatus(temp);
  const tdsStatus = getTdsStatus(tds);

  return (
    <ScrollView contentContainerStyle={s.scrollContent}>
      <View style={s.headerRow}>
        <Text style={s.h1}>Tank Status</Text>
        <Pressable onPress={onLogout}>
          <Text style={s.link}>Logout</Text>
        </Pressable>
      </View>

      {/* 1. VISUAL TANK LEVEL */}
      <Card style={s.tankVisualCard}>
        <Text style={s.cardTitle}>Water Level ({level.toFixed(0)}%)</Text>
        <TankVisual level={level} />
        <Text style={s.bigValue}>{level.toFixed(0)}% FULL</Text>
        <Text style={s.mutedSmall}>Capacity used: {level.toFixed(0)}%</Text>
      </Card>

      {/* 2. SENSOR READINGS */}
      <Row>
        <SensorCard 
          title="Temperature" 
          value={`${temp.toFixed(1)} °C`}
          status={tempStatus.status}
          statusColor={tempStatus.color}
          icon={tempStatus.icon}
        />
        <SensorCard 
          title="Purity (TDS)" 
          value={`${tds.toFixed(0)} ppm`} 
          status={tdsStatus.status}
          statusColor={tdsStatus.color}
          icon={tdsStatus.icon}
        />
      </Row>

      {/* 3. PUMP CONTROL */}
      <Card>
        <Text style={s.cardTitle}>Pump Control</Text>
        <View style={s.switchRow}>
          <Text style={s.pumpText}>
            {pumpOn ? "Pump Status: ON" : "Pump Status: OFF"}
          </Text>
          <Switch
            value={pumpOn}
            onValueChange={setPump}
            disabled={toggleBusy}
            trackColor={{ false: '#ccc', true: PRIMARY_BLUE }}
            thumbColor={pumpOn ? LIGHT_BLUE : '#f4f3f4'}
          />
        </View>
        <Text style={s.mutedSmall}>
          Toggle to turn the pump {pumpOn ? "off" : "on"}.
        </Text>
      </Card>
    </ScrollView>
  );
}

// Reusable Components
function Card({ children, style }) {
  return <View style={[s.card, style]}>{children}</View>;
}

function Row({ children }) {
  return <View style={{ flexDirection: "row", marginTop: 12 }}>{children}</View>;
}

function SensorCard({ title, value, status, statusColor, icon }) {
    return (
        <View style={[s.sensorCard, { borderLeftColor: statusColor }]}>
            <View style={s.sensorHeader}>
                <Text style={s.sensorIcon}>{icon}</Text>
                <Text style={s.cardTitle}>{title}</Text>
            </View>
            <Text style={s.bigValue}>{value}</Text>
            <Text style={[s.sensorStatus, { color: statusColor }]}>{status}</Text>
        </View>
    );
}

function TankVisual({ level = 0 }) {
    const clampedLevel = Math.max(0, Math.min(100, level));
    const waterHeight = `${clampedLevel}%`;
    const waterColor = PRIMARY_BLUE; 
    const waterShadowColor = 'rgba(25, 118, 210, 0.4)'; 

    return (
        <View style={s.tankContainer}>
            {/* Empty Tank Body */}
            <View style={s.tankBody} />
            
            {/* Water Level */}
            <View style={[s.tankWater, { 
                height: waterHeight, 
                backgroundColor: waterColor,
                shadowColor: waterShadowColor,
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.8,
                shadowRadius: 5,
            }]} />
        </View>
    );
}

// Styles
const s = StyleSheet.create({
  // --- General Layout ---
  scrollContent: {
    padding: 20,
    paddingBottom: 50,
  },
  authContainer: {
    flex: 1,
    padding: 30,
    backgroundColor: BACKGROUND_COLOR, 
    justifyContent: "center",
    alignItems: "center",
  },
  center: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center", 
    backgroundColor: BACKGROUND_COLOR 
  },
  
  // --- Typography ---
  h1: {
    fontSize: 28, 
    fontWeight: "700", 
    color: PRIMARY_BLUE,
    // fontFamily: 'Roboto', // Removed custom fonts for maximum compatibility
  },
  muted: {
    color: "#757575", 
    marginBottom: 24,
    fontSize: 16,
    // fontFamily: 'Open Sans',
  },
  mutedSmall: {
    color: "#757575",
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  
  // --- Header ---
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    width: "100%",
    paddingTop: 10,
  },
  
  // --- Inputs & Buttons ---
  input: {
    borderWidth: 1,
    borderColor: LIGHT_BLUE, 
    borderRadius: 12, 
    padding: 14, 
    marginBottom: 16,
    width: "100%",
    backgroundColor: "#FFFFFF", 
    fontSize: 16,
    color: '#333',
    // fontFamily: 'Open Sans',
  },
  btn: {
    backgroundColor: PRIMARY_BLUE, 
    padding: 16, 
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6, 
    width: "100%",
  },
  btnText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 18, 
    // fontFamily: 'Open Sans',
  },
  link: {
    color: PRIMARY_BLUE, 
    textAlign: "center",
    fontSize: 16,
    fontWeight: '600',
    // fontFamily: 'Open Sans',
  },
  err: {
    color: DANGER_RED, 
    marginBottom: 16,
    textAlign: "center",
    fontSize: 16,
    fontWeight: 'bold',
    // fontFamily: 'Open Sans',
  },
  
  // --- Cards ---
  card: {
    backgroundColor: "#fff",
    padding: 20, 
    borderRadius: 16, 
    marginBottom: 15,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8, 
    elevation: 4,
    width: "100%",
  },
  cardTitle: { 
    fontSize: 14, 
    fontWeight: "600", 
    marginBottom: 8,
    color: '#333',
  },
  bigValue: { 
    fontSize: 32, 
    fontWeight: "900",
    color: PRIMARY_BLUE,
    marginTop: 5,
    textAlign: 'center',
  },
  
  // --- Tank Visual Specific ---
  tankVisualCard: {
    alignItems: 'center',
    padding: 30,
    marginBottom: 20,
  },
  tankContainer: {
    width: 140,
    height: 220,
    borderRadius: 15,
    borderWidth: 4,
    borderColor: PRIMARY_BLUE,
    overflow: 'hidden',
    position: 'relative',
    marginVertical: 15,
  },
  tankBody: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: LIGHT_BLUE,
    opacity: 0.4,
  },
  tankWater: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    // We can't use 'transition...' in React Native styles, but we leave it here 
    // for potential web compatibility, though native will update instantly.
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  
  // --- Sensor Card Specific ---
  sensorCard: {
    flex: 1,
    backgroundColor: "#fff", 
    padding: 15, 
    borderRadius: 16, 
    shadowColor: "#000", 
    shadowOpacity: 0.1, 
    shadowRadius: 5, 
    elevation: 3,
    borderLeftWidth: 8, 
    marginRight: 10,
  },
  sensorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  sensorIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  sensorStatus: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 5,
  },
  
  // --- Pump Control Specific ---
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingVertical: 5,
  },
  pumpText: {
    fontSize: 18, 
    fontWeight: "700",
    color: '#333',
  }
});
