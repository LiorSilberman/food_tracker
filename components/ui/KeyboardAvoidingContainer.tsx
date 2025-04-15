import { ReactNode } from 'react';
import { SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, StatusBar,  ViewStyle, StyleProp  } from 'react-native';

type Props = {
    children: ReactNode;
    style?: StyleProp<ViewStyle>;
};

const KeyboardAvoidingContainer = ({ children, style }: Props) => {
    return (
        <SafeAreaView style={{ flex: 1 }}>
            <KeyboardAvoidingView style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={0}
            >
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={[styles.contentContainer, style]}
                >
                    {children}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
};

export default KeyboardAvoidingContainer;

const styles = StyleSheet.create({
    contentContainer: {
      padding: 20,
      paddingTop: Platform.OS === "android" 
        ? (StatusBar.currentHeight ?? 0) + 50 
        : 50,
      alignItems: 'center',
    },
  });
  