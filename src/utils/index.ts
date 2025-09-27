export const generateId = (): string => {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
};

export const formatDate = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const extractTextFromMarkdown = (markdown: string): string => {
  // Simple markdown to text conversion for previews
  return markdown
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/^\s*[-\*\+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .trim();
};

export const detectGesture = (points: { x: number; y: number }[]): string | null => {
  if (points.length < 10) return null;

  // Simple gesture recognition
  const startPoint = points[0];
  const endPoint = points[points.length - 1];
  const distance = Math.sqrt(
    Math.pow(endPoint.x - startPoint.x, 2) + Math.pow(endPoint.y - startPoint.y, 2)
  );

  // Check if it's a closed shape (circle detection)
  if (distance < 50 && points.length > 20) {
    return 'circle';
  }

  // Check for square-like gesture
  const corners = findCorners(points);
  if (corners.length >= 4) {
    return 'square';
  }

  // Check for triangle
  if (corners.length === 3) {
    return 'triangle';
  }

  return null;
};

const findCorners = (points: { x: number; y: number }[]): { x: number; y: number }[] => {
  // Simplified corner detection
  const corners: { x: number; y: number }[] = [];
  const threshold = 30; // degrees

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    const angle1 = Math.atan2(curr.y - prev.y, curr.x - prev.x);
    const angle2 = Math.atan2(next.y - curr.y, next.x - curr.x);
    const angleDiff = Math.abs(angle1 - angle2) * (180 / Math.PI);

    if (angleDiff > threshold && angleDiff < 180 - threshold) {
      corners.push(curr);
    }
  }

  return corners;
};