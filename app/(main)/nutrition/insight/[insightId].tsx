import { useLocalSearchParams, router } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Appbar,
  Card,
  Text,
  TextInput,
  Button,
  useTheme,
  ActivityIndicator,
  Avatar,
} from 'react-native-paper';
import { NutritionService } from '../../../../src/services/nutrition/NutritionService';

const InsightDetailScreen = () => {
  const theme = useTheme();
  const { insightId } = useLocalSearchParams();
  const [insight, setInsight] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chatHistory, setChatHistory] = useState<
    { sender: 'user' | 'ai'; text: string }[]
  >([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const fetchInsight = async () => {
      if (typeof insightId !== 'string') return;
      setIsLoading(true);
      try {
        const fetchedInsight = await NutritionService.getInsightById(insightId);
        setInsight(fetchedInsight);
        // Start the chat with the insight message as the first AI response
        if (fetchedInsight) {
          setChatHistory([
            { sender: 'ai', text: fetchedInsight.insight_message },
          ]);
        }
      } catch (error) {
        Alert.alert('Error', 'Could not load the insight details.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchInsight();
  }, [insightId]);

  const handleSend = async () => {
    if (!currentMessage.trim() || !insight) return;

    const newMessage = { sender: 'user' as const, text: currentMessage };
    const updatedHistory = [...chatHistory, newMessage];
    setChatHistory(updatedHistory);
    setCurrentMessage('');
    setIsSending(true);

    try {
      const aiResponse = await NutritionService.getCoachingResponse(
        insight,
        updatedHistory
      );
      setChatHistory([
        ...updatedHistory,
        { sender: 'ai' as const, text: aiResponse },
      ]);
    } catch (error) {
      setChatHistory([
        ...updatedHistory,
        {
          sender: 'ai' as const,
          text: 'Sorry, I had trouble connecting. Please try again.',
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Coaching Insight" />
      </Appbar.Header>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
        <ScrollView contentContainerStyle={styles.container}>
          {chatHistory.map((msg, index) => (
            <View
              key={index}
              style={[
                styles.messageContainer,
                msg.sender === 'user'
                  ? styles.userMessageContainer
                  : styles.aiMessageContainer,
              ]}>
              <Avatar.Icon
                size={32}
                icon={msg.sender === 'user' ? 'account' : 'robot-outline'}
                style={styles.avatar}
              />
              <Card
                style={[
                  styles.card,
                  msg.sender === 'user'
                    ? styles.userMessageCard
                    : styles.aiMessageCard,
                ]}>
                <Card.Content>
                  <Text style={styles.messageText}>{msg.text}</Text>
                </Card.Content>
              </Card>
            </View>
          ))}
          {isSending && <ActivityIndicator style={{ marginVertical: 8 }} />}
        </ScrollView>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            label="Ask for advice..."
            mode="outlined"
            value={currentMessage}
            onChangeText={setCurrentMessage}
            disabled={isSending}
          />
          <Button
            mode="contained"
            onPress={handleSend}
            disabled={!currentMessage.trim() || isSending}
            style={styles.sendButton}>
            Send
          </Button>
        </View>
      </KeyboardAvoidingView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    flexGrow: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    marginBottom: 8,
    maxWidth: '85%',
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  aiMessageContainer: {
    justifyContent: 'flex-start',
  },
  avatar: {
    marginRight: 8,
  },
  userMessageCard: {
    alignSelf: 'flex-end',
    backgroundColor: '#DCF8C6',
  },
  aiMessageCard: {
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderTopWidth: 1,
    borderColor: '#ccc',
  },
  input: {
    flex: 1,
    marginRight: 8,
  },
  sendButton: {
    justifyContent: 'center',
  },
});

export default InsightDetailScreen; 