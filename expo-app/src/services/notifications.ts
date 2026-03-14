import * as Notifications from 'expo-notifications';
import { FoodItem } from '@/types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationsPermission() {
  await Notifications.requestPermissionsAsync();
}

export async function scheduleExpiryNotifications(items: FoodItem[]) {
  await Notifications.cancelAllScheduledNotificationsAsync();

  for (const item of items) {
    const when = new Date(new Date(item.expirationDate).getTime() - 24 * 3600 * 1000);
    if (when.getTime() <= Date.now()) continue;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Alimento in scadenza',
        body: `${item.name} scade domani`,
      },
      trigger: {
        date: when,
      } as Notifications.DateTriggerInput,
    });
  }
}
