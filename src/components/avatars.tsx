export function Avatar({ name, color }: { name: string; color: string }) {
  return (
    <span title={name}
      className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold text-white ring-2 ring-white"
      style={{ backgroundColor: color }}>
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}
export function AvatarStack({ people }: { people: { id: string; name: string; color: string }[] }) {
  return (
    <div className="flex -space-x-1.5">
      {people.map((p) => <Avatar key={p.id} name={p.name} color={p.color} />)}
    </div>
  );
}
