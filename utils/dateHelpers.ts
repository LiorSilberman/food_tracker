// utils/dateHelpers.ts

/**
 * Formats a Date object into a string with day and month.
 * The formatting uses the Hebrew locale.
 *
 * @param date - The Date object to format.
 * @returns A formatted date string (e.g. "15/6").
 */
export const formatDate = (date: Date): string => {
    return date.toLocaleDateString("he-IL", { day: "numeric", month: "numeric" });
  }
  
  /**
   * Returns the name of the day in Hebrew based on a provided Date object.
   * This function takes into account the local timezone.
   *
   * @param date - The Date object.
   * @returns The Hebrew name of the day.
   */
  export const getDayName = (date: Date): string => {
    // Adjust the date to the local timezone
    const localDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
    const day = localDate.getDay();
    // Hebrew names for days: Sunday to Saturday.
    const hebrewDays = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
    return hebrewDays[day];
  }
  