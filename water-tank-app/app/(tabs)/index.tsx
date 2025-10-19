// app/(tabs)/index.tsx
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged, signInWithEmailAndPassword,
  signOut
} from "firebase/auth";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet, Switch,
  Text, TextInput,
  View
} from "react-native";
import { auth, db } from "../../firebase.js";

const TANK_ID = "tank_01"; // Firestore doc id

export default function Index() {
  const [user, setUser] = useState<null | { email: string }>(null);
  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u ? { email: u.email || "" } : null)), []);
  return user ? <Dashboard email={user.email} onLogout={() => signOut(auth)} /> : <AuthScreen />;
}

/* ---------------- AUTH ---------------- */
function AuthScreen() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState(""); const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");

  const submit = async () => {
    try {
      setBusy(true); setErr("");
      if (mode === "login")
        await signInWithEmailAndPassword(auth, email.trim(), pass);
      else
        await createUserWithEmailAndPassword(auth, email.trim(), pass);
    } catch (e: any) { setErr(e.message ?? String(e)); }
    finally { setBusy(false); }
  };

  return (
    <View style={s.container}>
      <Text style={s.h1}>🚰 Water Tank</Text>
      <Text style={s.muted}>Sign {mode === "login" ? "in" : "up"} to continue</Text>

      <TextInput style={s.input} autoCapitalize="none" keyboardType="email-address"
        placeholder="Email" value={email} onChangeText={setEmail}/>
      <TextInput style={s.input} secureTextEntry placeholder="Password"
        value={pass} onChangeText={setPass}/>

      {err ? <Text style={s.err}>{err}</Text> : null}

      <Pressable style={s.btn} onPress={submit} disabled={busy}>
        {busy ? <ActivityIndicator/> :
          <Text style={s.btnText}>{mode === "login" ? "Log in" : "Create account"}</Text>}
      </Pressable>

      <Pressable onPress={() => setMode(mode === "login" ? "signup" : "login")}>
        <Text style={s.link}>
          {mode === "login" ? "Need an account? Sign up" : "Have an account? Log in"}
        </Text>
      </Pressable>
    </View>
  );
}

/* ---------------- DASHBOARD ---------------- */
function Dashboard({ email, onLogout }: { email: string; onLogout: () => void }) {
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState<number>(0);
  const [temp, setTemp] = useState<number>(0);
  const [tds, setTds] = useState<number>(0);
  const [pumpOn, setPumpOn] = useState<boolean>(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    const ref = doc(db, "tanks", TANK_ID);
    const unsub = onSnapshot(ref, (snap) => {
      const d = snap.data() || {};
      setLevel(Number(d.level_pct ?? 0));
      setTemp(Number(d.temperature_c ?? 0));
      setTds(Number(d.tds_ppm ?? 0));
      setPumpOn(!!d.pump_on);
      setLoading(false);
    });
    return unsub;
  }, []);

  const setPump = async (v: boolean) => {
    setToggling(true);
    try { await updateDoc(doc(db, "tanks", TANK_ID), { pump_on: v }); }
    finally { setToggling(false); }
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large"/></View>;

  return (
    <View style={[s.container, { paddingTop: 24 }]}>
      <View style={s.headerRow}>
        <Text style={s.h1}>Tank Dashboard</Text>
        <Pressable onPress={onLogout}><Text style={s.link}>Logout</Text></Pressable>
      </View>

      <Card>
        <Text style={s.cardTitle}>Water Level</Text>
        <Text style={s.big}>{level.toFixed(0)}%</Text>
        <Text style={s.muted}>Capacity used</Text>
      </Card>

      <Row>
        <Card style={{flex:1}}>
          <Text style={s.cardTitle}>Temperature</Text>
          <Text style={s.big}>{temp.toFixed(1)} °C</Text>
        </Card>
        <Card style={{flex:1}}>
          <Text style={s.cardTitle}>Purity (TDS)</Text>
          <Text style={s.big}>{tds.toFixed(0)} ppm</Text>
          <Text style={s.muted}>{tds <= 300 ? "Good" : tds <= 600 ? "OK" : "Poor"}</Text>
        </Card>
      </Row>

      <Card>
        <Text style={s.cardTitle}>Pump Control</Text>
        <View style={s.switchRow}>
          <Text style={{fontSize:16,fontWeight:"600"}}>{pumpOn ? "Pump ON" : "Pump OFF"}</Text>
          <Switch value={pumpOn} onValueChange={setPump} disabled={toggling}/>
        </View>
        <Text style={s.muted}>Toggle to turn the pump {pumpOn ? "off" : "on"}.</Text>
      </Card>
    </View>
  );
}

/* ---------------- UI helpers ---------------- */
function Card({ children, style }: any) { return <View style={[s.card, style]}>{children}</View>; }
function Row({ children }: any) { return <View style={{flexDirection:"row", gap:12}}>{children}</View>; }

/* ---------------- styles ---------------- */
const s = StyleSheet.create({
  container:{ flex:1, padding:16 },
  center:{ flex:1, alignItems:"center", justifyContent:"center" },
  h1:{ fontSize:26, fontWeight:"800" },
  muted:{ color:"#6b7280" },
  input:{ backgroundColor:"#fff", borderRadius:12, padding:14, marginTop:10, borderWidth:1, borderColor:"#e5e7eb" },
  btn:{ backgroundColor:"#1992d4", padding:14, borderRadius:14, alignItems:"center", marginTop:14 },
  btnText:{ color:"#fff", fontWeight:"700" },
  link:{ color:"#1992d4", fontWeight:"700" },
  card:{ backgroundColor:"#fff", padding:16, borderRadius:16, marginTop:14, shadowColor:"#000", shadowOpacity:0.05, shadowRadius:8, elevation:2 },
  cardTitle:{ fontWeight:"700", marginBottom:8 },
  big:{ fontSize:28, fontWeight:"800" },
  headerRow:{ flexDirection:"row", justifyContent:"space-between", alignItems:"center" },
  switchRow:{ flexDirection:"row", justifyContent:"space-between", alignItems:"center" },
  err:{ color:"red", marginTop:8 },
});
