import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { colors, radius } from '../theme';
import SwedishFlag from '../components/SwedishFlag';
import { useAuth } from '../AuthContext';

export default function AuthScreen() {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      if (mode === 'signup') await signup(email.trim(), password, name.trim());
      else await login(email.trim(), password);
    } catch (e) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.hero}>
        <SwedishFlag width={76} />
        <Text style={styles.title}>Svenska</Text>
        <Text style={styles.sub}>{mode === 'signup' ? 'Create your account' : 'Welcome back'}</Text>
      </View>

      <View style={styles.card}>
        {mode === 'signup' && (
          <TextInput
            style={styles.input} placeholder="Your name" placeholderTextColor={colors.muted}
            value={name} onChangeText={setName} autoCapitalize="words"
          />
        )}
        <TextInput
          style={styles.input} placeholder="Email" placeholderTextColor={colors.muted}
          value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email"
        />
        <TextInput
          style={styles.input} placeholder="Password (6+ characters)" placeholderTextColor={colors.muted}
          value={password} onChangeText={setPassword} secureTextEntry onSubmitEditing={submit} returnKeyType="go"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable onPress={submit} disabled={busy} style={({ pressed }) => [styles.btn, busy && styles.btnDisabled, pressed && styles.pressed]}>
          {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.btnText}>{mode === 'signup' ? 'Sign up' : 'Log in'}</Text>}
        </Pressable>
        <Pressable onPress={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(null); }} hitSlop={8}>
          <Text style={styles.toggle}>
            {mode === 'signup' ? 'Already have an account? Log in' : 'New here? Create an account'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', padding: 24 },
  hero: { alignItems: 'center', marginBottom: 24 },
  title: { color: colors.yellow, fontSize: 40, fontWeight: '800', marginTop: 12, letterSpacing: 0.5 },
  sub: { color: '#CFE5F3', fontSize: 15, marginTop: 4 },
  card: { width: '100%', maxWidth: 360, backgroundColor: colors.card, borderRadius: radius.lg, padding: 20 },
  input: {
    backgroundColor: colors.bg, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 16, color: colors.ink, borderWidth: 1, borderColor: colors.line, marginBottom: 12,
  },
  error: { color: colors.red, fontSize: 13, marginBottom: 10, fontWeight: '600' },
  btn: { backgroundColor: colors.blue, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  btnDisabled: { backgroundColor: '#B9C6D2' },
  btnText: { color: colors.white, fontWeight: '800', fontSize: 16 },
  toggle: { color: colors.blue, textAlign: 'center', marginTop: 16, fontWeight: '600', fontSize: 14 },
  pressed: { opacity: 0.85 },
});
