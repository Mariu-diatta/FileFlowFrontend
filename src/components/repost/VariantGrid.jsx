import { VariantCard } from "./VariantCard";

export function VariantGrid({ variants }) {
  if (!variants || variants.length === 0) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {variants.map((variant) => (
        <VariantCard key={variant.id} variant={variant} />
      ))}
    </div>
  );
}
