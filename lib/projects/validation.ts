const ALLOWED_COLORS = [
  "red",
  "coral",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "teal",
  "sky",
  "blue",
  "purple",
  "pink",
] as const;

type FieldErrors = Partial<
  Record<"name" | "key" | "description" | "color" | "startDate" | "endDate", string>
>;

export function validateProjectFields(input: {
  name: string;
  key: string;
  description: string;
  color: string;
  startDate: string;
  endDate?: string;
}): FieldErrors {
  const errors: FieldErrors = {};

  const trimmedName = input.name.trim();
  if (!trimmedName) {
    errors.name = "Project name is required";
  } else if (trimmedName.length > 255) {
    errors.name = "Project name must be 255 characters or fewer";
  }

  if (!/^[A-Z0-9]{2,6}$/.test(input.key)) {
    errors.key = "Key must be 2–6 uppercase letters or digits (e.g., PROJ, MKT1)";
  }

  const trimmedDescription = input.description.trim();
  if (!trimmedDescription) {
    errors.description = "Description is required";
  } else if (trimmedDescription.length > 10000) {
    errors.description = "Description must be 10 000 characters or fewer";
  }

  if (!(ALLOWED_COLORS as readonly string[]).includes(input.color)) {
    errors.color = "Select a color from the palette";
  }

  if (!input.startDate) {
    errors.startDate = "A valid start date is required";
  }

  if (input.endDate && input.endDate <= input.startDate) {
    errors.endDate = "End date must be after the start date";
  }

  return errors;
}