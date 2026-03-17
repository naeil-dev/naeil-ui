const ANIMALS = [
  "/images/coral.png",
  "/images/fish.png",
  "/images/jellyfish.png",
  "/images/turtle.png",
  "/images/whale.png",
  "/images/diver.png",
];

export { ANIMALS };

export function hashUserId(id: string, size: number = ANIMALS.length): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % size;
}
