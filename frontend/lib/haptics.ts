import * as Haptics from 'expo-haptics';

/**
* Легка вібрація при натисканні на кнопки
*/
export const buttonPress = () => {
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

/**
* Середня вібрація для важливіших дій
*/
export const buttonPressMedium = () => {
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
};

/**
* Сильна вібрація для критичних дій
*/
export const buttonPressHeavy = () => {
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
};

/**
* Вібрація при успішній операції
*/
export const notificationSuccess = () => {
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
};

/**
* Вібрація при помилці
*/
export const notificationError = () => {
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
};

/**
* Вібрація при попередженні
*/
export const notificationWarning = () => {
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
};
