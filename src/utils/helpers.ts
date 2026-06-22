export const classNames = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

export type Validator = (v: any) => string | null;

export const validators = {
  required: (v: any): string | null =>
    v != null && v.toString().trim() ? null : "Required",
  email: (v: any): string | null =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v ?? "").trim()) ? null : "Invalid email",
  password: (v: any): string | null =>
    (v ?? "").length >= 8 ? null : "Min 8 characters",
  confirmPassword: (pw: string): Validator => (v) =>
    v === pw ? null : "Passwords do not match",
  phone: (v: any): string | null =>
    !v || /^\+?[\d\s\-()]{7,15}$/.test(v.trim()) ? null : "Invalid phone",
  minLength: (min: number): Validator => (v) =>
    (v ?? "").trim().length >= min ? null : `Min ${min} characters`,
};

export function validateFields(
  rules: Record<string, Validator | Validator[]>,
  values: Record<string, any>
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const key of Object.keys(rules)) {
    const rule = rules[key];
    const list = Array.isArray(rule) ? rule : [rule];
    for (const fn of list) {
      const err = fn(values[key]);
      if (err) {
        errors[key] = err;
        break;
      }
    }
  }
  return errors;
}

export const hasErrors = (errors: Record<string, string>) =>
  Object.values(errors).some(Boolean);

export const getRoleColors = (role: string) => {
  switch (role) {
    case "admin":
      return { bg: "bg-ink-950", text: "text-sand-50", accent: "bg-sand-400" };
    case "collector":
      return { bg: "bg-forest-600", text: "text-forest-50", accent: "bg-forest-300" };
    case "citizen":
    default:
      return { bg: "bg-forest-100", text: "text-forest-900", accent: "bg-forest-500" };
  }
};

export const formatDate = (iso?: string | null) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
};
