export interface TextNode {
  x: number;
  y: number;
  value: string;
}

export function row(text: TextNode[], y: number) {
  return text.filter(t => t.y == y)
    .sort((a, b) => a.x - b.x);
}

export function column(text: TextNode[], x: number) {
  return text.filter(t => t.x == x)
    .sort((a, b) => a.y - b.y);
}
