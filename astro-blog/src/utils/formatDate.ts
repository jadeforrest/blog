export function formatDate(dateInput: string | Date): string {
  const date = new Date(dateInput);

  if (isNaN(date.valueOf())) {
    return "Recently";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
