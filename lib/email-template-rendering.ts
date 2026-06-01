export const PREPARATION_TEMPLATE_PLACEHOLDERS = [
  '{{studentName}}',
  '{{courseName}}',
  '{{className}}',
  '{{programName}}',
  '{{schedule}}',
  '{{tutorFirstName}}',
  '{{meetLink}}',
] as const;

export type PreparationTemplateContext = {
  studentName: string;
  courseName: string;
  className: string;
  programName: string;
  schedule: string;
  tutorFirstName: string;
  meetLink: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function autoLinkUrls(value: string): string {
  return value.replace(/(https?:\/\/[^\s<]+)/g, (url) => {
    return `<a href="${url}" style="color:#2563eb;text-decoration:underline;">${url}</a>`;
  });
}

export function renderTemplateText(template: string, context: PreparationTemplateContext): string {
  return PREPARATION_TEMPLATE_PLACEHOLDERS.reduce((result, placeholder) => {
    const key = placeholder.slice(2, -2) as keyof PreparationTemplateContext;
    return result.split(placeholder).join(context[key] || '');
  }, template);
}

export function formatSafeRichTextHtml(value: string): string {
  const lines = value.replace(/\r\n/g, '\n').split('\n');
  const blocks: string[] = [];
  let paragraph: string[] = [];
  let bullets: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    const content = paragraph.map((line) => autoLinkUrls(escapeHtml(line))).join('<br>');
    blocks.push(`<p style="margin:0 0 14px;color:#475569;font-size:15px;line-height:1.7;">${content}</p>`);
    paragraph = [];
  };

  const flushBullets = () => {
    if (bullets.length === 0) return;
    blocks.push(
      `<ul style="margin:0 0 14px 18px;padding:0;color:#475569;font-size:15px;line-height:1.7;">${bullets
        .map((line) => `<li style="margin:4px 0;">${autoLinkUrls(escapeHtml(line))}</li>`)
        .join('')}</ul>`
    );
    bullets = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      flushBullets();
      return;
    }

    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      flushParagraph();
      bullets.push(bulletMatch[1]);
      return;
    }

    flushBullets();
    paragraph.push(trimmed);
  });

  flushParagraph();
  flushBullets();

  return blocks.join('') || '<p style="margin:0;color:#475569;font-size:15px;line-height:1.7;">No instructions provided.</p>';
}
