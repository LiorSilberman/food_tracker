import { View, Text, TouchableOpacity, StyleSheet } from "react-native"
import { Ionicons } from "@expo/vector-icons"

type SettingsItemProps = {
  label: string
  value: string
  onPress: () => void
  hidden?: boolean
}

type SettingsCardProps = {
  title: string
  items: SettingsItemProps[]
}

const SettingsCard = ({ title, items }: SettingsCardProps) => {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>

      {items
        .filter((item) => !item.hidden)
        .map((item, index) => (
          <TouchableOpacity
            key={item.label}
            style={[styles.settingItem, index < items.filter((i) => !i.hidden).length - 1 && styles.borderBottom]}
            onPress={item.onPress}
          >
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>{item.label}</Text>
              <Text style={styles.settingValue}>{item.value}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
          </TouchableOpacity>
        ))}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 16,
    textAlign: "right",
  },
  settingItem: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: "#0f172a",
    textAlign: "right",
  },
  settingValue: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 4,
    textAlign: "right",
  },
})

export default SettingsCard
