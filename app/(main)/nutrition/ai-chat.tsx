import { router, useLocalSearchParams, useFocusEffect, useNavigation } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TextInput, TouchableOpacity, Keyboard } from 'react-native';
import { Appbar, Text, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../src/hooks/useAuth';
import { NutritionService } from '../../../src/services/nutrition/NutritionService';
import { useSubscription } from '../../../src/hooks/useSubscription';

interface ChatMessage { sender: 'user' | 'ai'; text: string }

export default function NutritionAIChatScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { isPremium, remainingChatMessages, useChatMessage, openPaywall } = useSubscription();
  const { planId } = useLocalSearchParams<{ planId?: string }>();
  const navigation = useNavigation();
  const [plan, setPlan] = useState<any | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { sender: 'ai', text: 'Hi! I am your nutrition assistant. Tell me what you want to adjust. For example: “Reduce calories by ~200 while keeping protein high” or “Make this plan pescatarian.”' },
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Hide tab bar while this screen is focused
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ tabBarStyle: { display: 'none' } });
      return () => navigation.getParent()?.setOptions({ tabBarStyle: undefined });
    }, [navigation])
  );

  useEffect(() => {
    const load = async () => {
      if (!planId) return;
      const p = await NutritionService.getNutritionPlanById(String(planId));
      setPlan(p);
    };
    load();
  }, [planId]);

  const sendMessage = async () => {
    if (!input.trim() || !plan || !user) return;
    if (!isPremium) {
      const ok = useChatMessage();
      if (!ok) {
        openPaywall();
        return;
      }
    }
    const userMsg: ChatMessage = { sender: 'user', text: input.trim() };
    const history = [...chatHistory, userMsg];
    setChatHistory(history);
    setInput('');
    setIsSending(true);
    Keyboard.dismiss();

    try {
      const data = await NutritionService.chatAdjustNutritionPlan(history, plan, user);
      setChatHistory((prev) => [...prev, { sender: 'ai', text: data.aiMessage || 'OK.' }]);
      if (data.newPlan) {
        setPlan((prev) => ({ ...(prev || {}), ...data.newPlan }));
      }
    } catch (err) {
      setChatHistory((prev) => [...prev, { sender: 'ai', text: 'Sorry, I could not process that. Please try again.' }]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <View style={styles.container}>
      <Appbar.Header statusBarHeight={insets.top}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Nutrition AI" />
      </Appbar.Header>

      <FlatList
        data={chatHistory}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <View style={[styles.msg, item.sender === 'user' ? styles.userMsg : styles.aiMsg]}>
            <Text style={styles.msgText}>{item.text}</Text>
          </View>
        )}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 + insets.bottom }}
      />

      <View style={[styles.inputBarFixed, { paddingBottom: Math.max(insets.bottom + 8, 16) }]}>
        <TextInput
          style={styles.input}
          placeholder="Ask to adjust your plan..."
          placeholderTextColor="#999"
          value={input}
          onChangeText={setInput}
          editable={!isSending}
          onSubmitEditing={sendMessage}
          returnKeyType="send"
        />
        <TouchableOpacity style={styles.sendButton} disabled={isSending} onPress={sendMessage}>
          {isSending ? <ActivityIndicator /> : <Text style={styles.sendText}>Send</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  msg: { padding: 12, borderRadius: 12, marginBottom: 8, maxWidth: '85%' },
  userMsg: { alignSelf: 'flex-end', backgroundColor: 'rgba(255,107,53,0.2)' },
  aiMsg: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.08)' },
  msgText: { color: 'white', fontSize: 15 },
  inputBarFixed: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.1)' },
  input: { flex: 1, paddingVertical: 12, paddingHorizontal: 12, color: 'white' },
  sendButton: { paddingVertical: 10, paddingHorizontal: 14, marginLeft: 8, backgroundColor: '#FF6B35', borderRadius: 10 },
  sendText: { color: 'white', fontWeight: '700' },
}); 