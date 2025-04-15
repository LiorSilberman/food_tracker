import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Request permissions and setup notification channel (Android)
export async function registerForPushNotificationsAsync(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    alert('לא התקבלה הרשאה לשלוח התראות');
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  return true;
}

// // ✅ Schedule a notification every day at 13:40
// export async function scheduleDailyLunchNotification() {
//   await Notifications.scheduleNotificationAsync({
//     content: {
//       title: '🍽️ זמן לארוחת צהריים!',
//       body: 'אל תשכח לאכול ולתעד את הצלחת שלך באפליקציה 😊',
//       sound: true,
//     },
//     trigger: {
//       hour: 14,
//       minute: 29,
//       repeats: true,
//       // 👇 This must be cast to CalendarTriggerInput
//     } as Notifications.CalendarTriggerInput,
//   });
// }
