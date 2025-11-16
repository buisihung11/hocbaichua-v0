import { useChat } from "@ai-sdk/react";
import { Ionicons } from "@expo/vector-icons";
import { DefaultChatTransport } from "ai";
import { fetch as expoFetch } from "expo/fetch";
import { Card, useThemeColor } from "heroui-native";
import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Container } from "@/components/container";

const generateAPIUrl = (relativePath: string) => {
  const serverUrl = process.env.EXPO_PUBLIC_SERVER_URL;
  if (!serverUrl) {
    throw new Error(
      "EXPO_PUBLIC_SERVER_URL environment variable is not defined"
    );
  }
  const path = relativePath.startsWith("/") ? relativePath : `/${relativePath}`;
  return serverUrl.concat(path);
};

export default function AIScreen() {
  const [input, setInput] = useState("");
  const { messages, error, sendMessage } = useChat({
    transport: new DefaultChatTransport({
      fetch: expoFetch as unknown as typeof globalThis.fetch,
      api: generateAPIUrl("/ai"),
    }),
    onError: (err) => console.error(err, "AI Chat Error"),
  });
  const scrollViewRef = useRef<ScrollView>(null);
  const mutedColor = useThemeColor("muted");
  const _accentColor = useThemeColor("accent");
  const foregroundColor = useThemeColor("foreground");
  const _dangerColor = useThemeColor("danger");

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, []);

  const onSubmit = () => {
    const value = input.trim();
    if (value) {
      sendMessage({ text: value });
      setInput("");
    }
  };

  if (error) {
    return (
      <Container>
        <View className="flex-1 items-center justify-center px-4">
          <Card className="bg-danger/10 p-4" variant="flat">
            <Text className="mb-2 text-center font-semibold text-danger text-lg">
              Error: {error.message}
            </Text>
            <Text className="text-center text-muted">
              Please check your connection and try again.
            </Text>
          </Card>
        </View>
      </Container>
    );
  }

  return (
    <Container>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 px-4 py-6">
          <View className="mb-6">
            <Text className="mb-2 font-bold text-2xl text-foreground">
              AI Chat
            </Text>
            <Text className="text-muted">Chat with our AI assistant</Text>
          </View>
          <ScrollView
            className="mb-4 flex-1"
            ref={scrollViewRef}
            showsVerticalScrollIndicator={false}
          >
            {messages.length === 0 ? (
              <View className="flex-1 items-center justify-center">
                <Text className="text-center text-lg text-muted">
                  Ask me anything to get started!
                </Text>
              </View>
            ) : (
              <View className="gap-3">
                {messages.map((message) => (
                  <Card
                    className={`p-3 ${
                      message.role === "user" ? "ml-8 bg-accent/10" : "mr-8"
                    }`}
                    key={message.id}
                    variant={message.role === "user" ? "flat" : "secondary"}
                  >
                    <Text className="mb-1 font-semibold text-foreground text-sm">
                      {message.role === "user" ? "You" : "AI Assistant"}
                    </Text>
                    <View className="gap-1">
                      {message.parts.map((part, i) =>
                        part.type === "text" ? (
                          <Text
                            className="text-foreground leading-relaxed"
                            key={`${message.id}-${i}`}
                          >
                            {part.text}
                          </Text>
                        ) : (
                          <Text
                            className="text-foreground leading-relaxed"
                            key={`${message.id}-${i}`}
                          >
                            {JSON.stringify(part)}
                          </Text>
                        )
                      )}
                    </View>
                  </Card>
                ))}
              </View>
            )}
          </ScrollView>
          <View className="border-divider border-t pt-4">
            <View className="flex-row items-end gap-2">
              <TextInput
                autoFocus={true}
                className="max-h-[120px] min-h-[40px] flex-1 rounded-lg border border-divider bg-surface px-3 py-2 text-foreground"
                onChangeText={setInput}
                onSubmitEditing={(e) => {
                  e.preventDefault();
                  onSubmit();
                }}
                placeholder="Type your message..."
                placeholderTextColor={mutedColor}
                value={input}
              />
              <Pressable
                className={`rounded-lg p-2 active:opacity-70 ${
                  input.trim() ? "bg-accent" : "bg-surface"
                }`}
                disabled={!input.trim()}
                onPress={onSubmit}
              >
                <Ionicons
                  color={input.trim() ? foregroundColor : mutedColor}
                  name="send"
                  size={20}
                />
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Container>
  );
}
