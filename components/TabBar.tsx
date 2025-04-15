"use client"

import { useState, useEffect } from "react"
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform } from "react-native"
import { AntDesign, FontAwesome6, Ionicons } from "@expo/vector-icons"
import UploadPickerModal from "../components/ui/UploadPickerModal"
import { useRouter } from "expo-router"
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs"
import { useImageUploadStore } from "../stores/imageUploadStore"
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from "react-native-reanimated"
import { BlurView } from "expo-blur"

const { width } = Dimensions.get("window")
const primaryColor = "#0891b2"
const primaryColorLight = "#0ab3db"
const greyColor = "#737373"
const darkGreyColor = "#404040"

const icons = {
  home: (props: any) => <AntDesign name="home" size={24} {...props} />,
  addImage: (props: any) => <Ionicons name="add" size={28} {...props} />,
  progress: (props: any) => <Ionicons name="trending-up" size={24} {...props} />,
  dailySummary: (props: any) => <FontAwesome6 name="bars-progress" size={22} {...props} />,
}

type TabRouteName = keyof typeof icons

const TabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const [showUploadModal, setShowUploadModal] = useState(false)
  const setImageData = useImageUploadStore((state) => state.setImageData)
  const resetUpload = useImageUploadStore((state) => state.reset)
  const router = useRouter()

  // Animation values
  const tabPositions = [useSharedValue(0), useSharedValue(0), useSharedValue(0), useSharedValue(0)]
  const tabScales = [useSharedValue(1), useSharedValue(1), useSharedValue(1), useSharedValue(1)]
  const addButtonScale = useSharedValue(1)
  const addButtonRotation = useSharedValue(0)

  // Store tab positions after layout
  const setTabPosition = (index: number, x: number) => {
    tabPositions[index].value = x
  }

  const handleImageSelected = (uri: string, base64: string) => {
    resetUpload()

    setTimeout(() => {
      setImageData(uri, base64)
      setShowUploadModal(false)
    }, 0)
  }

  // Handle add button press with animation - fixed version
  const handleAddPress = () => {
    // Start animations
    addButtonScale.value = withSpring(0.9, { damping: 10 })
    addButtonRotation.value = withTiming(45, { duration: 300 })

    // Show modal immediately - don't wait for animations
    setShowUploadModal(true)

    // Reset animations after modal is shown
    setTimeout(() => {
      addButtonScale.value = withSpring(1)
      addButtonRotation.value = withTiming(0, { duration: 300 })
    }, 300)
  }

  // Reset button animation when modal is closed
  useEffect(() => {
    if (!showUploadModal) {
      addButtonScale.value = withSpring(1)
      addButtonRotation.value = withTiming(0)
    }
  }, [showUploadModal])

  // Animated styles for add button
  const addButtonAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: addButtonScale.value }, { rotate: `${addButtonRotation.value}deg` }],
    }
  })

  return (
    <>
      {/* Main Tab Bar */}
      <View style={styles.tabbarContainer}>
        {Platform.OS === "ios" ? (
          <BlurView intensity={80} tint="light" style={styles.tabbar}>
            <TabBarContent
              state={state}
              descriptors={descriptors}
              navigation={navigation}
              setTabPosition={setTabPosition}
              tabScales={tabScales}
              addButtonAnimatedStyle={addButtonAnimatedStyle}
              handleAddPress={handleAddPress}
              primaryColor={primaryColor}
              greyColor={greyColor}
            />
          </BlurView>
        ) : (
          <View style={styles.tabbar}>
            <TabBarContent
              state={state}
              descriptors={descriptors}
              navigation={navigation}
              setTabPosition={setTabPosition}
              tabScales={tabScales}
              addButtonAnimatedStyle={addButtonAnimatedStyle}
              handleAddPress={handleAddPress}
              primaryColor={primaryColor}
              greyColor={greyColor}
            />
          </View>
        )}
      </View>

      {/* Upload Modal */}
      <UploadPickerModal
        isVisible={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onImageSelected={handleImageSelected}
      />
    </>
  )
}

// Separate component for tab bar content to work with BlurView
const TabBarContent = ({
  state,
  descriptors,
  navigation,
  setTabPosition,
  tabScales,
  addButtonAnimatedStyle,
  handleAddPress,
  primaryColor,
  greyColor,
}: {
  state: any
  descriptors: any
  navigation: any
  setTabPosition: (index: number, x: number) => void
  tabScales: Animated.SharedValue<number>[]
  addButtonAnimatedStyle: any
  handleAddPress: () => void
  primaryColor: string
  greyColor: string
}) => {
  return (
    <>
      {state.routes.map((route: any, index: number) => {
        const routeName = route.name as TabRouteName
        const { options } = descriptors[route.key]
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
              ? options.title
              : route.name === "progress"
                ? "תהליך"
                : route.name

        const isFocused = state.index === index

        // Animate tab scale on focus change
        useEffect(() => {
          tabScales[index].value = withSpring(isFocused ? 1.1 : 1, { damping: 10 })
        }, [isFocused, index, tabScales])

        // Animated style for each tab
        const tabAnimatedStyle = useAnimatedStyle(() => {
          return {
            transform: [{ scale: tabScales[index].value }],
          }
        })

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          })

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name)
          }
        }

        const onLongPress = () => {
          navigation.emit({
            type: "tabLongPress",
            target: route.key,
          })
        }

        return (
          <TouchableOpacity
            key={route.name}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarButtonTestID}
            onPress={route.name === "addImage" ? handleAddPress : onPress}
            onLongPress={onLongPress}
            style={[styles.tabbarItem, route.name === "addImage" && styles.addTabItem]}
            onLayout={(e) => {
              // Store the x position of each tab for indicator animation
              setTabPosition(index, e.nativeEvent.layout.x + e.nativeEvent.layout.width / 2)
            }}
          >
            {route.name === "addImage" ? (
              <Animated.View style={[styles.addButton, addButtonAnimatedStyle]}>
                {icons[routeName]({ color: "#fff" })}
              </Animated.View>
            ) : (
              <Animated.View style={[styles.tabContent, tabAnimatedStyle]}>
                {icons[routeName]({
                  color: isFocused ? primaryColor : greyColor,
                })}
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color: isFocused ? primaryColor : greyColor,
                      fontWeight: isFocused ? "600" : "400",
                    },
                  ]}
                >
                  {label}
                </Text>
                {isFocused && <View style={styles.activeIndicator} />}
              </Animated.View>
            )}
          </TouchableOpacity>
        )
      })}
    </>
  )
}

const styles = StyleSheet.create({
  tabbarContainer: {
    position: "absolute",
    bottom: 25,
    left: 20,
    right: 20,
    alignItems: "center",
  },
  tabbar: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Platform.OS === "ios" ? "rgba(255,255,255,0.7)" : "white",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 16,
    shadowOpacity: 0.1,
    elevation: 10,
    borderWidth: Platform.OS === "ios" ? 0 : 0.2,
    borderColor: "rgba(0,0,0,0.05)",
  },
  tabbarItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: 50,
  },
  tabContent: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 5,
  },
  addTabItem: {
    marginTop: -30,
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: primaryColor,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: primaryColor,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
    // Gradient effect with border
    borderWidth: 3,
    borderColor: primaryColorLight,
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  activeIndicator: {
    position: "absolute",
    bottom: -8,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: primaryColor,
  },
})

export default TabBar
