import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, StyleSheet, SafeAreaView,
  RefreshControl, Alert, Animated,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { io } from "socket.io-client";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000";

const socket = io(BASE_URL, {
  transports: ["websocket"],
  autoConnect: true,
  reconnection: true,
});

const C = {
  bg:       "#F8F9FC",
  surface:  "#FFFFFF",
  card:     "#FFFFFF",
  border:   "#E5E7EB",
  accent:   "#EF4444",
  accentL:  "#F87171",
  accentDim:"#B91C1C",
  gold:     "#F59E0B",
  green:    "#10B981",
  red:      "#EF4444",
  orange:   "#F97316",
  text:     "#111827",
  muted:    "#6B7280",
  subtle:   "#9CA3AF",
};

const STATUS_CFG = {
  waiting:     { label: "Waiting",     color: C.gold,   bg: "#FFFBEB" },
  in_progress: { label: "In Progress", color: C.accent, bg: "#FEF2F2" },
  completed:   { label: "Completed",   color: C.green,  bg: "#ECFDF5" },
  cancelled:   { label: "Cancelled",   color: C.red,    bg: "#FEF2F2" },
};

async function apiFetch(method, path, body) {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || json?.message || `HTTP ${res.status}`);
    return json.data !== undefined ? json.data : json;
  } catch (e) {
    throw new Error(e.message || "Network error");
  }
}

const API = {
  createCustomer: (name, phone) =>
    apiFetch("POST", "/api/customers", { name, phone }),
  bookTicket: (customer_id, service_id, queue_id) =>
    apiFetch("POST", "/api/customers/book", { customer_id, service_id, queue_id }),
  trackTicket: (ticketId) =>
    apiFetch("GET", `/api/customers/track/${ticketId}`),
  cancelTicket: (ticketId) =>
    apiFetch("DELETE", `/api/customers/cancel/${ticketId}`),
  getNotifications: (customerId) =>
    apiFetch("GET", `/api/customers/${customerId}/notifications`),
  // Fetch services directly from /api/services
  getServices: async () => {
    const res = await fetch(`${BASE_URL}/api/services`);
    const json = await res.json();
    const data = json.data || json;
    return Array.isArray(data) ? data : [];
  },
};

const Session = {
  get:    async (k)    => { try { const v = await AsyncStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } },
  set:    async (k, v) => AsyncStorage.setItem(k, JSON.stringify(v)),
  remove: async (k)    => AsyncStorage.removeItem(k),
};

function Pill({ status }) {
  const cfg = STATUS_CFG[status] || { label: status, color: C.muted, bg: C.card };
  return (
    <View style={{ backgroundColor: cfg.bg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3,
      borderWidth: 1, borderColor: cfg.color + "55" }}>
      <Text style={{ color: cfg.color, fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6 }}>
        {cfg.label}
      </Text>
    </View>
  );
}

function Btn({ label, onPress, variant = "primary", loading, disabled }) {
  const bg = variant === "primary" ? C.accent : variant === "danger" ? C.red
           : variant === "success" ? C.green : "transparent";
  const color = variant === "ghost" ? C.subtle : "#fff";
  const border = variant === "ghost" ? { borderWidth: 1, borderColor: C.border } : {};
  return (
    <TouchableOpacity onPress={onPress} disabled={loading || disabled} activeOpacity={0.75}
      style={[{ backgroundColor: bg, borderRadius: 12, paddingVertical: 14,
        alignItems: "center", opacity: loading || disabled ? 0.5 : 1 }, border]}>
      {loading
        ? <ActivityIndicator color={color} />
        : <Text style={{ color, fontWeight: "700", fontSize: 15 }}>{label}</Text>}
    </TouchableOpacity>
  );
}

function Field({ label, ...props }) {
  return (
    <View style={{ marginBottom: 14 }}>
      {label && <Text style={{ color: C.subtle, fontSize: 12, fontWeight: "600",
        marginBottom: 6, letterSpacing: 0.4 }}>{label}</Text>}
      <TextInput placeholderTextColor={C.muted}
        style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
          borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
          color: C.text, fontSize: 15 }}
        {...props} />
    </View>
  );
}

function Card({ children, accentColor, style }) {
  return (
    <View style={[{ backgroundColor: C.card, borderRadius: 14, padding: 16, marginBottom: 12,
      borderWidth: accentColor ? 1.5 : 1,
      borderColor: accentColor ? accentColor + "77" : C.border,
      shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    }, style]}>
      {children}
    </View>
  );
}

function SLabel({ children }) {
  return <Text style={{ color: C.muted, fontSize: 10, fontWeight: "700",
    letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>{children}</Text>;
}

function Stepper({ status }) {
  const steps = ["waiting", "in_progress", "completed"];
  const idx   = steps.indexOf(status);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
      {steps.map((step, i) => {
        const done = i < idx, cur = i === idx, cfg = STATUS_CFG[step];
        return (
          <React.Fragment key={step}>
            <View style={{ flex: 1, alignItems: "center" }}>
              <View style={{ width: 26, height: 26, borderRadius: 13,
                backgroundColor: done ? C.green : cur ? cfg.color : C.surface,
                borderWidth: 2, borderColor: done ? C.green : cur ? cfg.color : C.border,
                alignItems: "center", justifyContent: "center" }}>
                {done
                  ? <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>✓</Text>
                  : cur
                    ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" }} />
                    : null}
              </View>
              <Text style={{ color: done || cur ? C.text : C.muted, fontSize: 9,
                marginTop: 4, fontWeight: cur ? "700" : "400", textTransform: "capitalize" }}>
                {cfg.label}
              </Text>
            </View>
            {i < steps.length - 1 && (
              <View style={{ height: 2, width: 24, backgroundColor: i < idx ? C.green : C.border,
                marginBottom: 16 }} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

/* ════════════════════════════════════════════════════════════════════
   SCREEN: Welcome
════════════════════════════════════════════════════════════════════ */
function WelcomeScreen({ navigation }) {
  const [name,  setName]  = useState("");
  const [phone, setPhone] = useState("");
  const [busy,  setBusy]  = useState(false);

  const submit = async () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert("Missing info", "Please enter your name and phone number.");
      return;
    }
    setBusy(true);
    try {
      const customer = await API.createCustomer(name.trim(), phone.trim());
      await Session.set("customer", customer);
      navigation.replace("Home");
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: "center", marginBottom: 36, marginTop: 40 }}>
          <View style={{ width: 80, height: 80, borderRadius: 24,
            backgroundColor: C.accent, alignItems: "center",
            justifyContent: "center", marginBottom: 20,
            shadowColor: C.accent, shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 }}>
            <Text style={{ fontSize: 36 }}>🎟</Text>
          </View>
          <Text style={s.h1}>Welcome to Queue.io</Text>
          <Text style={s.sub}>Enter your details to join the queue</Text>
        </View>

        <Card>
          <Field label="Full Name" placeholder="Your name" value={name}
            onChangeText={setName} autoCapitalize="words" />
          <Field label="Phone Number" placeholder="+213 555 000 000" value={phone}
            onChangeText={setPhone} keyboardType="phone-pad" />
          <View style={{ marginTop: 4 }}>
            <Btn label="Get Started" onPress={submit} loading={busy} />
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ════════════════════════════════════════════════════════════════════
   SCREEN: Home
════════════════════════════════════════════════════════════════════ */
function HomeScreen({ navigation }) {
  const [customer,      setCustomer]      = useState(null);
  const [activeTicket,  setActiveTicket]  = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [refreshing,    setRefreshing]    = useState(false);
  const [loading,       setLoading]       = useState(true);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const loadData = useCallback(async () => {
    const cust = await Session.get("customer");
    if (!cust) { navigation.replace("Welcome"); return; }
    setCustomer(cust);

    const tid = await Session.get("activeTicketId");
    if (tid) {
      try {
        const ticket = await API.trackTicket(tid);
        if (ticket.status === "waiting" || ticket.status === "in_progress") {
          setActiveTicket({ id: tid, ...ticket });
        } else {
          await Session.remove("activeTicketId");
          setActiveTicket(null);
        }
      } catch {
        await Session.remove("activeTicketId");
        setActiveTicket(null);
      }
    } else {
      setActiveTicket(null);
    }

    try {
      const notifs = await API.getNotifications(cust.id);
      setNotifications(Array.isArray(notifs) ? notifs.slice(0, 4) : []);
    } catch {}

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const iv = setInterval(loadData, 8000);
    return () => clearInterval(iv);
  }, [loadData]);

  useEffect(() => {
    socket.on("queue-update", () => { loadData(); });
    socket.on("ticket-ended", () => { loadData(); });
    socket.on("new-ticket",   () => { loadData(); });
    return () => {
      socket.off("queue-update");
      socket.off("ticket-ended");
      socket.off("new-ticket");
    };
  }, [loadData]);

  useEffect(() => {
    if (activeTicket?.status === "in_progress") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.04, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,    duration: 700, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [activeTicket?.status]);

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const logout = async () => {
    const confirmed = window.confirm("Sign out? This will clear your session.");
    if (confirmed) {
      await Session.remove("customer");
      await Session.remove("activeTicketId");
      navigation.reset({ index: 0, routes: [{ name: "Welcome" }] });
    }
  };

  if (loading) return (
    <SafeAreaView style={s.safe}>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.page}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}>

        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 24 }}>
          <View style={{ flex: 1 }}>
            <Text style={s.h1}>Hello, {customer?.name?.split(" ")[0]} 👋</Text>
            <Text style={s.sub}>{customer?.phone}</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate("Notifications")} style={{ marginRight: 12 }}>
            <Text style={{ color: C.accent, fontSize: 13, fontWeight: "600" }}>🔔 Alerts</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={logout}>
            <Text style={{ color: C.muted, fontSize: 13 }}>Sign out</Text>
          </TouchableOpacity>
        </View>

        {activeTicket ? (
          <>
            <SLabel>Your active ticket</SLabel>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Card accentColor={activeTicket.status === "in_progress" ? C.accent : C.gold}>
                <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 14 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.muted, fontSize: 10, fontWeight: "700",
                      letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 }}>Ticket</Text>
                    <Text style={{ color: C.accent, fontSize: 42, fontWeight: "900", lineHeight: 46 }}>
                      #{activeTicket.ticket_number}
                    </Text>
                  </View>
                  <Pill status={activeTicket.status} />
                </View>
                <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
                  <View style={{ flex: 1, backgroundColor: C.bg, borderRadius: 10, padding: 12 }}>
                    <Text style={{ color: C.muted, fontSize: 10, marginBottom: 4 }}>Position</Text>
                    <Text style={{ color: C.gold, fontSize: 20, fontWeight: "800" }}>
                      {activeTicket.status === "in_progress" ? "🎯 Now" : `#${activeTicket.queue_position}`}
                    </Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: C.bg, borderRadius: 10, padding: 12 }}>
                    <Text style={{ color: C.muted, fontSize: 10, marginBottom: 4 }}>Est. wait</Text>
                    <Text style={{ color: C.accent, fontSize: 16, fontWeight: "800" }}>
                      {activeTicket.status === "in_progress" ? "Your turn!" : activeTicket.estimated_wait}
                    </Text>
                  </View>
                </View>
                {activeTicket.service_name && (
                  <View style={{ backgroundColor: C.bg, borderRadius: 10, padding: 10, marginBottom: 12 }}>
                    <Text style={{ color: C.muted, fontSize: 12 }}>
                      {activeTicket.service_name} · {activeTicket.queue_name || "Main Queue"}
                    </Text>
                  </View>
                )}
                <Btn label="View & Manage Ticket →"
                  onPress={() => navigation.navigate("Ticket", { ticketId: activeTicket.id })} />
              </Card>
            </Animated.View>
          </>
        ) : (
          <>
            <SLabel>Ready to queue?</SLabel>
            <Card style={{ alignItems: "center", paddingVertical: 32 }}>
              <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: C.accent + "15",
                alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                <Text style={{ fontSize: 32 }}>🎟</Text>
              </View>
              <Text style={{ color: C.text, fontSize: 16, fontWeight: "700", marginBottom: 8 }}>
                No active ticket
              </Text>
              <Text style={{ color: C.muted, fontSize: 13, textAlign: "center", marginBottom: 20, lineHeight: 20 }}>
                Book your spot and we'll notify you when it's your turn.
              </Text>
              <View style={{ width: "100%" }}>
                <Btn label="Book a Ticket" onPress={() => navigation.navigate("Book")} />
              </View>
            </Card>
          </>
        )}

        {notifications.length > 0 && (
          <>
            <SLabel>Recent notifications</SLabel>
            {notifications.map((n, i) => (
              <View key={n.id || i} style={{
                flexDirection: "row", alignItems: "flex-start", gap: 10,
                backgroundColor: C.card, borderRadius: 10, padding: 13, marginBottom: 8,
                borderWidth: n.is_read ? 1 : 1.5,
                borderColor: n.is_read ? C.border : C.accent + "55",
              }}>
                <View style={{ width: 7, height: 7, borderRadius: 4,
                  backgroundColor: n.is_read ? C.muted : C.accent, marginTop: 5 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, fontSize: 12, lineHeight: 18 }}>{n.message}</Text>
                  <Text style={{ color: C.muted, fontSize: 10, marginTop: 3 }}>
                    {new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ════════════════════════════════════════════════════════════════════
   SCREEN: Book — fetches services from real backend
════════════════════════════════════════════════════════════════════ */
function BookScreen({ navigation }) {
  const [services,    setServices]    = useState([]);
  const [selectedSvc, setSelectedSvc] = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [booking,     setBooking]     = useState(false);
  const [confirmed,   setConfirmed]   = useState(null);
  const [error,       setError]       = useState("");

  useEffect(() => {
    (async () => {
      try {
        // Fetch real services from backend — includes anything admin added
        const svcs = await API.getServices();
        if (svcs.length > 0) {
          setServices(svcs);
          setSelectedSvc(svcs[0]);
        } else {
          setError("No services available. Please contact the operator.");
        }
      } catch (e) {
        setError("Could not load services: " + e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const book = async () => {
    const customer = await Session.get("customer");
    if (!customer || !selectedSvc) return;
    setBooking(true);
    try {
      const result = await API.bookTicket(customer.id, selectedSvc.id, 1);
      await Session.set("activeTicketId", result.ticket_id);
      setConfirmed(result);
    } catch (e) {
      Alert.alert("Booking failed", e.message);
    } finally { setBooking(false); }
  };

  if (loading) return (
    <SafeAreaView style={s.safe}>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={C.accent} size="large" />
        <Text style={{ color: C.muted, marginTop: 12 }}>Loading services…</Text>
      </View>
    </SafeAreaView>
  );

  if (confirmed) return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.page}>
        <View style={{ alignItems: "center", paddingVertical: 28 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40,
            backgroundColor: C.green + "20", alignItems: "center",
            justifyContent: "center", marginBottom: 16 }}>
            <Text style={{ fontSize: 36 }}>✅</Text>
          </View>
          <Text style={[s.h1, { textAlign: "center" }]}>You're in the queue!</Text>
          <Text style={[s.sub, { textAlign: "center", marginBottom: 24 }]}>
            We'll notify you when it's your turn
          </Text>
        </View>
        <Card accentColor={C.accent}>
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <Text style={{ color: C.muted, fontSize: 10, fontWeight: "700",
              letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Ticket Number</Text>
            <Text style={{ color: C.accent, fontSize: 60, fontWeight: "900", lineHeight: 64 }}>
              #{confirmed.ticket_number}
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
            <View style={{ flex: 1, backgroundColor: C.bg, borderRadius: 10, padding: 12, alignItems: "center" }}>
              <Text style={{ color: C.muted, fontSize: 10, marginBottom: 4 }}>Queue position</Text>
              <Text style={{ color: C.gold, fontSize: 22, fontWeight: "800" }}>#{confirmed.queue_position}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: C.bg, borderRadius: 10, padding: 12, alignItems: "center" }}>
              <Text style={{ color: C.muted, fontSize: 10, marginBottom: 4 }}>Est. wait</Text>
              <Text style={{ color: C.accent, fontSize: 18, fontWeight: "800" }}>{confirmed.estimated_wait}</Text>
            </View>
          </View>
          <View style={{ backgroundColor: C.bg, borderRadius: 10, padding: 12 }}>
            <Text style={{ color: C.muted, fontSize: 10 }}>Service</Text>
            <Text style={{ color: C.text, fontWeight: "600", marginTop: 2 }}>{confirmed.service}</Text>
          </View>
        </Card>
        <View style={{ gap: 10 }}>
          <Btn label="Track my ticket →"
            onPress={() => { navigation.replace("Home"); navigation.navigate("Ticket", { ticketId: confirmed.ticket_id }); }} />
          <Btn label="Back to Home" variant="ghost" onPress={() => navigation.replace("Home")} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.page}>
        <Text style={[s.h1, { marginBottom: 4 }]}>Book a ticket</Text>
        <Text style={[s.sub, { marginBottom: 20 }]}>Choose a service to join the queue</Text>

        {error ? (
          <View style={{ backgroundColor: "#FEF2F2", borderRadius: 10, padding: 16,
            borderWidth: 1, borderColor: C.red + "44", marginBottom: 16 }}>
            <Text style={{ color: C.red, fontSize: 13 }}>{error}</Text>
          </View>
        ) : null}

        <SLabel>Select service</SLabel>
        {services.map(svc => (
          <TouchableOpacity key={svc.id} onPress={() => setSelectedSvc(svc)} activeOpacity={0.7}>
            <View style={{
              flexDirection: "row", alignItems: "center",
              backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 8,
              borderWidth: selectedSvc?.id === svc.id ? 2 : 1,
              borderColor: selectedSvc?.id === svc.id ? C.accent : C.border,
              shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
            }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontWeight: "600", fontSize: 15, marginBottom: 2 }}>
                  {svc.name}
                </Text>
                <Text style={{ color: C.muted, fontSize: 12 }}>
                  ~{svc.estimated_time} min per customer
                </Text>
              </View>
              <View style={{
                width: 22, height: 22, borderRadius: 11,
                borderWidth: 2, borderColor: selectedSvc?.id === svc.id ? C.accent : C.border,
                backgroundColor: selectedSvc?.id === svc.id ? C.accent : "transparent",
                alignItems: "center", justifyContent: "center",
              }}>
                {selectedSvc?.id === svc.id && (
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" }} />
                )}
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {selectedSvc && (
          <Card style={{ marginTop: 8, backgroundColor: C.accent + "08", borderColor: C.accent + "33" }}>
            <Text style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>Booking summary</Text>
            <Text style={{ color: C.text, fontWeight: "700", fontSize: 15 }}>{selectedSvc.name}</Text>
            <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
              Estimated service time: {selectedSvc.estimated_time} min
            </Text>
          </Card>
        )}

        <View style={{ gap: 10, marginTop: 8 }}>
          <Btn label="Confirm Booking" onPress={book} loading={booking} disabled={!selectedSvc || !!error} />
          <Btn label="Cancel" variant="ghost" onPress={() => navigation.goBack()} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ════════════════════════════════════════════════════════════════════
   SCREEN: Ticket
════════════════════════════════════════════════════════════════════ */
function TicketScreen({ route, navigation }) {
  const { ticketId } = route.params;
  const [ticket,        setTicket]        = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [cancelling,    setCancelling]    = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const loadTicket = useCallback(async () => {
    try {
      const t = await API.trackTicket(ticketId);
      setTicket(t);
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally { setLoading(false); }
  }, [ticketId]);

  useEffect(() => {
    loadTicket();
    const iv = setInterval(loadTicket, 6000);
    return () => clearInterval(iv);
  }, [loadTicket]);

  useEffect(() => {
    socket.on("queue-update", loadTicket);
    socket.on("ticket-ended", loadTicket);
    return () => {
      socket.off("queue-update", loadTicket);
      socket.off("ticket-ended", loadTicket);
    };
  }, [loadTicket]);

  const cancel = async () => {
    setCancelling(true);
    try {
      await API.cancelTicket(ticketId);
      await Session.remove("activeTicketId");
      Alert.alert("Cancelled", "Your ticket has been cancelled.", [
        { text: "OK", onPress: () => navigation.replace("Home") },
      ]);
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally { setCancelling(false); setConfirmCancel(false); }
  };

  if (loading) return (
    <SafeAreaView style={s.safe}>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 14 }}>
        <ActivityIndicator color={C.accent} size="large" />
        <Text style={{ color: C.muted }}>Loading ticket…</Text>
      </View>
    </SafeAreaView>
  );

  if (!ticket) return (
    <SafeAreaView style={s.safe}>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
        <Text style={{ color: C.text, fontSize: 16, textAlign: "center", marginBottom: 20 }}>Ticket not found.</Text>
        <Btn label="Go Home" onPress={() => navigation.replace("Home")} />
      </View>
    </SafeAreaView>
  );

  const cfg      = STATUS_CFG[ticket.status] || STATUS_CFG.waiting;
  const isActive = ticket.status === "waiting" || ticket.status === "in_progress";

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.page}>
        <View style={{ backgroundColor: cfg.bg, borderRadius: 16, padding: 20,
          borderWidth: 1.5, borderColor: cfg.color + "44", alignItems: "center", marginBottom: 16 }}>
          <Text style={{ color: C.muted, fontSize: 10, fontWeight: "700",
            letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Ticket Number</Text>
          <Text style={{ color: cfg.color, fontSize: 64, fontWeight: "900", lineHeight: 68, marginBottom: 8 }}>
            #{ticket.ticket_number}
          </Text>
          <Pill status={ticket.status} />
        </View>

        {ticket.status !== "cancelled" && <Stepper status={ticket.status} />}

        {ticket.status === "waiting" && (
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
            <View style={{ flex: 1, backgroundColor: C.card, borderRadius: 12, padding: 14,
              borderWidth: 1, borderColor: C.border, alignItems: "center" }}>
              <Text style={{ color: C.muted, fontSize: 10, marginBottom: 6 }}>Queue position</Text>
              <Text style={{ color: C.gold, fontSize: 28, fontWeight: "900" }}>#{ticket.queue_position}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: C.card, borderRadius: 12, padding: 14,
              borderWidth: 1, borderColor: C.border, alignItems: "center" }}>
              <Text style={{ color: C.muted, fontSize: 10, marginBottom: 6 }}>Est. wait</Text>
              <Text style={{ color: C.accent, fontSize: 22, fontWeight: "900" }}>{ticket.estimated_wait}</Text>
            </View>
          </View>
        )}

        {ticket.status === "in_progress" && (
          <Card accentColor={C.accent} style={{ alignItems: "center", paddingVertical: 20 }}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>🎯</Text>
            <Text style={{ color: C.text, fontSize: 18, fontWeight: "700", marginBottom: 4 }}>It's your turn!</Text>
            <Text style={{ color: C.muted, fontSize: 13, textAlign: "center" }}>Please proceed to the service counter.</Text>
          </Card>
        )}

        {ticket.status === "completed" && (
          <Card accentColor={C.green} style={{ alignItems: "center", paddingVertical: 20 }}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>✅</Text>
            <Text style={{ color: C.text, fontSize: 18, fontWeight: "700", marginBottom: 4 }}>Service Completed</Text>
            <Text style={{ color: C.muted, fontSize: 13 }}>Thank you for using Queue.io!</Text>
          </Card>
        )}

        {ticket.status === "cancelled" && (
          <Card accentColor={C.red} style={{ alignItems: "center", paddingVertical: 20 }}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>❌</Text>
            <Text style={{ color: C.text, fontSize: 18, fontWeight: "700", marginBottom: 4 }}>Ticket Cancelled</Text>
          </Card>
        )}

        <Card style={{ marginBottom: 16 }}>
          <SLabel>Details</SLabel>
          {[
            ["Customer", ticket.customer_name],
            ["Service",  ticket.service_name],
            ["Queue",    ticket.queue_name || "Main Queue"],
          ].filter(([, v]) => v).map(([label, value]) => (
            <View key={label} style={{ flexDirection: "row", justifyContent: "space-between",
              paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.border }}>
              <Text style={{ color: C.muted, fontSize: 13 }}>{label}</Text>
              <Text style={{ color: C.text, fontSize: 13, fontWeight: "600" }}>{value}</Text>
            </View>
          ))}
        </Card>

        {isActive && (
          <Text style={{ color: C.muted, fontSize: 11, textAlign: "center", marginBottom: 12 }}>
            Auto-refreshing · updates instantly via server
          </Text>
        )}

        {isActive && !confirmCancel && (
          <View style={{ marginBottom: 10 }}>
            <Btn label="Cancel My Booking" variant="danger" onPress={() => setConfirmCancel(true)} />
          </View>
        )}
        {confirmCancel && (
          <Card accentColor={C.red} style={{ marginBottom: 10 }}>
            <Text style={{ color: C.text, fontSize: 13, fontWeight: "600",
              marginBottom: 14, textAlign: "center" }}>Are you sure you want to cancel?</Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Btn label="Keep it" variant="ghost" onPress={() => setConfirmCancel(false)} />
              </View>
              <View style={{ flex: 1 }}>
                <Btn label="Yes, cancel" variant="danger" onPress={cancel} loading={cancelling} />
              </View>
            </View>
          </Card>
        )}

        <Btn label="← Back to Home" variant="ghost" onPress={() => navigation.replace("Home")} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ════════════════════════════════════════════════════════════════════
   SCREEN: Notifications
════════════════════════════════════════════════════════════════════ */
function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);

  const load = async () => {
    const cust = await Session.get("customer");
    if (!cust) return;
    try {
      const notifs = await API.getNotifications(cust.id);
      setNotifications(Array.isArray(notifs) ? notifs : []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.page}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}>
        <Text style={[s.h1, { marginBottom: 4 }]}>Notifications</Text>
        <Text style={[s.sub, { marginBottom: 20 }]}>Your queue activity</Text>

        {loading && <ActivityIndicator color={C.accent} style={{ marginTop: 40 }} />}

        {!loading && notifications.length === 0 && (
          <View style={{ alignItems: "center", paddingTop: 60 }}>
            <Text style={{ fontSize: 36, marginBottom: 12 }}>🔔</Text>
            <Text style={{ color: C.muted, fontSize: 15 }}>No notifications yet.</Text>
          </View>
        )}

        {notifications.map((n, i) => (
          <View key={n.id || i} style={{
            backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 8,
            borderWidth: n.is_read ? 1 : 1.5,
            borderColor: n.is_read ? C.border : C.accent + "55",
            flexDirection: "row", alignItems: "flex-start", gap: 10,
            shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
          }}>
            <View style={{ width: 7, height: 7, borderRadius: 4,
              backgroundColor: n.is_read ? C.muted : C.accent, marginTop: 5 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.text, fontSize: 13, lineHeight: 19 }}>{n.message}</Text>
              <Text style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>
                {new Date(n.created_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
              </Text>
            </View>
          </View>
        ))}

        <View style={{ marginTop: 8 }}>
          <Btn label="← Back" variant="ghost" onPress={() => navigation.goBack()} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ════════════════════════════════════════════════════════════════════
   NAVIGATOR
════════════════════════════════════════════════════════════════════ */
const Stack = createNativeStackNavigator();

export default function App() {
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    Session.get("customer").then(c => setInitialRoute(c ? "Home" : "Welcome"));
  }, []);

  if (!initialRoute) return (
    <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator color={C.accent} size="large" />
    </View>
  );

  return (
    <>
      <StatusBar style="dark" />
      <NavigationContainer>
        <Stack.Navigator initialRouteName={initialRoute} screenOptions={{
          headerStyle:         { backgroundColor: C.surface },
          headerTintColor:     C.accent,
          headerTitleStyle:    { fontWeight: "700", fontSize: 16, color: C.text },
          headerShadowVisible: true,
          contentStyle:        { backgroundColor: C.bg },
        }}>
          <Stack.Screen name="Welcome"       component={WelcomeScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Home"          component={HomeScreen}    options={{ title: "Queue.io", headerLeft: () => null }} />
          <Stack.Screen name="Book"          component={BookScreen}    options={{ title: "Book a Ticket" }} />
          <Stack.Screen name="Ticket"        component={TicketScreen}  options={{ title: "My Ticket" }} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: "Notifications" }} />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  page: { padding: 20, paddingBottom: 40 },
  h1:   { fontSize: 22, fontWeight: "800", color: C.text, marginBottom: 4 },
  sub:  { fontSize: 13, color: C.muted, lineHeight: 18 },
});