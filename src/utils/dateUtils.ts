/**
 * Date utility functions for consistent date handling across the app
 */

/**
 * Formats a date to YYYY-MM-DD string without timezone conversion
 * This prevents the common issue where dates get shifted by timezone when using toISOString()
 * 
 * @param year - Full year (e.g., 2006)
 * @param month - Month (1-12, not 0-11)
 * @param day - Day of month (1-31)
 * @returns Date string in YYYY-MM-DD format
 */
export const formatDateToYYYYMMDD = (year: number, month: number, day: number): string => {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

/**
 * Formats a Date object to YYYY-MM-DD string without timezone conversion
 * Uses the local date components instead of UTC
 * 
 * @param date - Date object
 * @returns Date string in YYYY-MM-DD format
 */
export const formatDateObjectToYYYYMMDD = (date: Date): string => {
  return formatDateToYYYYMMDD(
    date.getFullYear(),
    date.getMonth() + 1, // getMonth() returns 0-11, we need 1-12
    date.getDate()
  );
};

/**
 * Parses a YYYY-MM-DD date string to a Date object
 * Creates the date in local timezone to avoid timezone shift issues
 * 
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Date object in local timezone
 */
export const parseDateFromYYYYMMDD = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day); // month - 1 because Date constructor expects 0-11
};

/**
 * Gets today's date in YYYY-MM-DD format without timezone conversion
 * 
 * @returns Today's date string in YYYY-MM-DD format
 */
export const getTodayYYYYMMDD = (): string => {
  return formatDateObjectToYYYYMMDD(new Date());
};

/**
 * Calculates age from a birthday date string
 * 
 * @param birthdayString - Birthday in YYYY-MM-DD format
 * @returns Age in years
 */
export const calculateAge = (birthdayString: string): number => {
  const birthDate = parseDateFromYYYYMMDD(birthdayString);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  // Adjust age if birthday hasn't occurred this year yet
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

/**
 * Formats a date string for display (e.g., "June 28, 2006")
 * 
 * @param dateString - Date string in YYYY-MM-DD format
 * @param options - Intl.DateTimeFormatOptions for formatting
 * @returns Formatted date string
 */
export const formatDateForDisplay = (
  dateString: string, 
  options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }
): string => {
  const date = parseDateFromYYYYMMDD(dateString);
  return date.toLocaleDateString('en-US', options);
};




