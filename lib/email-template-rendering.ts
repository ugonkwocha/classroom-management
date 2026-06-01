export const PREPARATION_TEMPLATE_PLACEHOLDERS = [
  '{{recipientName}}',
  '{{recipientRole}}',
  '{{parentName}}',
  '{{studentName}}',
  '{{courseName}}',
  '{{className}}',
  '{{programName}}',
  '{{schedule}}',
  '{{tutorFirstName}}',
  '{{meetLink}}',
  '{{meetButton}}',
] as const;

export type PreparationTemplateContext = {
  recipientName: string;
  recipientRole: 'parent' | 'student';
  parentName: string;
  studentName: string;
  courseName: string;
  className: string;
  programName: string;
  schedule: string;
  tutorFirstName: string;
  meetLink: string;
  meetButton: string;
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

function renderRecipientBlocks(template: string, context: PreparationTemplateContext): string {
  return template
    .replace(/\{\{#parent\}\}([\s\S]*?)\{\{\/parent\}\}/g, context.recipientRole === 'parent' ? '$1' : '')
    .replace(/\{\{#student\}\}([\s\S]*?)\{\{\/student\}\}/g, context.recipientRole === 'student' ? '$1' : '');
}

export function renderTemplateText(template: string, context: PreparationTemplateContext): string {
  return PREPARATION_TEMPLATE_PLACEHOLDERS.reduce((result, placeholder) => {
    const key = placeholder.slice(2, -2) as keyof PreparationTemplateContext;
    return result.split(placeholder).join(context[key] || '');
  }, renderRecipientBlocks(template, context));
}

function buildMeetButtonHtml(url: string): string {
  const safeUrl = escapeHtml(url);
  return `<a href="${safeUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;">Join Google Meet</a>`;
}

function renderTemplateForHtml(template: string, context: PreparationTemplateContext, buttonToken: string): string {
  return PREPARATION_TEMPLATE_PLACEHOLDERS.reduce((result, placeholder) => {
    if (placeholder === '{{meetButton}}') {
      return result.split(placeholder).join(buttonToken);
    }

    const key = placeholder.slice(2, -2) as keyof PreparationTemplateContext;
    return result.split(placeholder).join(context[key] || '');
  }, renderRecipientBlocks(template, context));
}

function renderInlineHtml(value: string, meetButtonHtml?: string, buttonToken?: string): string {
  const rendered = autoLinkUrls(escapeHtml(value));
  return meetButtonHtml && buttonToken ? rendered.split(buttonToken).join(meetButtonHtml) : rendered;
}

export function formatSafeRichTextHtml(value: string, options?: { meetButtonHtml?: string; buttonToken?: string }): string {
  const lines = value.replace(/\r\n/g, '\n').split('\n');
  const blocks: string[] = [];
  let paragraph: string[] = [];
  let bullets: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    const content = paragraph
      .map((line) => renderInlineHtml(line, options?.meetButtonHtml, options?.buttonToken))
      .join('<br>');
    blocks.push(`<p style="margin:0 0 14px;color:#475569;font-size:15px;line-height:1.7;">${content}</p>`);
    paragraph = [];
  };

  const flushBullets = () => {
    if (bullets.length === 0) return;
    blocks.push(
      `<ul style="margin:0 0 14px 18px;padding:0;color:#475569;font-size:15px;line-height:1.7;">${bullets
        .map((line) => `<li style="margin:4px 0;">${renderInlineHtml(line, options?.meetButtonHtml, options?.buttonToken)}</li>`)
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

export function renderTemplateHtml(template: string, context: PreparationTemplateContext): string {
  const buttonToken = '__9CK_MEET_BUTTON__';
  const value = renderTemplateForHtml(template, context, buttonToken);
  const meetButtonHtml = context.meetLink ? buildMeetButtonHtml(context.meetLink) : undefined;

  return formatSafeRichTextHtml(value, {
    meetButtonHtml,
    buttonToken,
  });
}
