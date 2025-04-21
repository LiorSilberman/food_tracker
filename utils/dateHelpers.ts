// utils/dateHelpers.ts

/**
 * Converts a birth date into an age in years.
 * @param birthDate - Date of birth.
 * @returns Age in completed years.
 */
export const calculateAge = (birthDate: Date): number => {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

/**
 * Formats a Date object into a string with day and month.
 * The formatting uses the Hebrew locale.
 */
export const formatDate = (date: Date): string => {
  return date.toLocaleDateString("he-IL", { day: "numeric", month: "numeric" });
}

/**
 * Returns the name of the day in Hebrew based on a provided Date object.
 */
export const getDayName = (date: Date): string => {
  const localDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
  const day = localDate.getDay();
  const hebrewDays = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  return hebrewDays[day];
}
