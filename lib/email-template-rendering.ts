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

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/`/g, '&#096;');
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
  const rendered = PREPARATION_TEMPLATE_PLACEHOLDERS.reduce((result, placeholder) => {
    const key = placeholder.slice(2, -2) as keyof PreparationTemplateContext;
    return result.split(placeholder).join(context[key] || '');
  }, renderRecipientBlocks(template, context));

  return templateContainsHtml(rendered) ? htmlToPlainText(rendered) : rendered;
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

function renderTemplateForRichHtml(template: string, context: PreparationTemplateContext, buttonToken: string): string {
  return PREPARATION_TEMPLATE_PLACEHOLDERS.reduce((result, placeholder) => {
    if (placeholder === '{{meetButton}}') {
      return result.split(placeholder).join(buttonToken);
    }

    const key = placeholder.slice(2, -2) as keyof PreparationTemplateContext;
    return result.split(placeholder).join(escapeHtml(context[key] || ''));
  }, renderRecipientBlocks(template, context));
}

function renderInlineHtml(value: string, meetButtonHtml?: string, buttonToken?: string): string {
  const rendered = autoLinkUrls(escapeHtml(value));
  return meetButtonHtml && buttonToken ? rendered.split(buttonToken).join(meetButtonHtml) : rendered;
}

const ALLOWED_TAGS = new Set([
  'a',
  'b',
  'br',
  'div',
  'em',
  'font',
  'i',
  'li',
  'ol',
  'p',
  'span',
  'strong',
  'u',
  'ul',
]);

const EMAIL_TEXT_STYLE = 'margin:0 0 14px;color:#475569;font-size:15px;line-height:1.7;';
const EMAIL_LIST_STYLE = 'margin:0 0 14px 18px;padding:0;color:#475569;font-size:15px;line-height:1.7;';
const EMAIL_LIST_ITEM_STYLE = 'margin:4px 0;';
const EMAIL_LINK_STYLE = 'color:#2563eb;text-decoration:underline;';
const ALLOWED_FONT_SIZES = new Set(['12px', '14px', '15px', '16px', '18px', '20px', '24px', '28px', '32px']);
const FONT_TAG_SIZE_MAP: Record<string, string> = {
  '1': '12px',
  '2': '14px',
  '3': '16px',
  '4': '18px',
  '5': '24px',
  '6': '28px',
  '7': '32px',
};

function templateContainsHtml(value: string): boolean {
  return /<\/?(?:a|b|br|div|em|font|i|li|ol|p|span|strong|u|ul)\b/i.test(value);
}

function normalizeFontSize(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  const pxMatch = trimmed.match(/^(\d{1,2})px$/);
  if (pxMatch) {
    const size = `${pxMatch[1]}px`;
    return ALLOWED_FONT_SIZES.has(size) ? size : null;
  }
  return FONT_TAG_SIZE_MAP[trimmed] || null;
}

function componentToHex(value: number): string {
  return value.toString(16).padStart(2, '0');
}

function normalizeColor(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();

  if (/^#[0-9a-f]{6}$/i.test(trimmed)) {
    return trimmed;
  }

  const shortHex = trimmed.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i);
  if (shortHex) {
    return `#${shortHex[1]}${shortHex[1]}${shortHex[2]}${shortHex[2]}${shortHex[3]}${shortHex[3]}`.toLowerCase();
  }

  const rgb = trimmed.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
  if (rgb) {
    const values = rgb.slice(1).map((part) => Number(part));
    if (values.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)) {
      return `#${values.map(componentToHex).join('')}`;
    }
  }

  return null;
}

function buildSpanStyle(size?: string | null, color?: string | null): string {
  const styles: string[] = [];
  if (size) styles.push(`font-size:${size}`);
  if (color) styles.push(`color:${color}`);
  return styles.length > 0 ? ` style="${styles.join(';')};"` : '';
}

function getAttribute(attrs: string, name: string): string | null {
  const quoted = attrs.match(new RegExp(`\\s${name}\\s*=\\s*["']([^"']*)["']`, 'i'));
  if (quoted) return quoted[1];
  const unquoted = attrs.match(new RegExp(`\\s${name}\\s*=\\s*([^\\s>]+)`, 'i'));
  return unquoted?.[1] || null;
}

function sanitizeUrl(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^(https?:\/\/|mailto:)/i.test(trimmed)) {
    return escapeAttribute(trimmed);
  }
  return null;
}

function sanitizeOpeningTag(tag: string, attrs: string): string {
  switch (tag) {
    case 'a': {
      const href = sanitizeUrl(getAttribute(attrs, 'href'));
      if (!href) return '<span>';
      return `<a href="${href}" style="${EMAIL_LINK_STYLE}">`;
    }
    case 'b':
    case 'strong':
      return '<strong>';
    case 'i':
    case 'em':
      return '<em>';
    case 'u':
      return '<u>';
    case 'br':
      return '<br>';
    case 'div':
    case 'p':
      return `<p style="${EMAIL_TEXT_STYLE}">`;
    case 'ul':
      return `<ul style="${EMAIL_LIST_STYLE}">`;
    case 'ol':
      return `<ol style="${EMAIL_LIST_STYLE}">`;
    case 'li':
      return `<li style="${EMAIL_LIST_ITEM_STYLE}">`;
    case 'font': {
      const size = normalizeFontSize(getAttribute(attrs, 'size'));
      const color = normalizeColor(getAttribute(attrs, 'color'));
      return `<span${buildSpanStyle(size, color)}>`;
    }
    case 'span': {
      const style = getAttribute(attrs, 'style');
      const size = normalizeFontSize(style?.match(/font-size\s*:\s*([^;]+)/i)?.[1] || null);
      const color = normalizeColor(style?.match(/color\s*:\s*([^;]+)/i)?.[1] || null);
      return `<span${buildSpanStyle(size, color)}>`;
    }
    default:
      return '';
  }
}

function sanitizeClosingTag(tag: string): string {
  switch (tag) {
    case 'a':
      return '</a>';
    case 'b':
    case 'strong':
      return '</strong>';
    case 'i':
    case 'em':
      return '</em>';
    case 'u':
      return '</u>';
    case 'div':
    case 'p':
      return '</p>';
    case 'ul':
      return '</ul>';
    case 'ol':
      return '</ol>';
    case 'li':
      return '</li>';
    case 'font':
    case 'span':
      return '</span>';
    default:
      return '';
  }
}

export function sanitizeTemplateBodyHtml(value: string): string {
  if (!templateContainsHtml(value)) {
    return value.trim();
  }

  return value
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\s*(\/?)\s*([a-z0-9]+)([^>]*)>/gi, (_match, closing: string, rawTag: string, attrs: string) => {
      const tag = rawTag.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) return '';
      if (tag === 'br') return '<br>';
      return closing ? sanitizeClosingTag(tag) : sanitizeOpeningTag(tag, attrs || '');
    })
    .replace(/<p style="[^"]*">\s*(?:<br>)?\s*<\/p>/gi, '')
    .trim();
}

function htmlToPlainText(value: string): string {
  return value
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*\/(?:p|div|li|ul|ol|h[1-6])\s*>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function formatSanitizedHtmlTemplate(value: string, meetButtonHtml?: string, buttonToken?: string): string {
  const sanitized = sanitizeTemplateBodyHtml(value);
  const withButton = meetButtonHtml && buttonToken ? sanitized.split(buttonToken).join(meetButtonHtml) : sanitized;
  return withButton || `<p style="${EMAIL_TEXT_STYLE}">No instructions provided.</p>`;
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
  const meetButtonHtml = context.meetLink ? buildMeetButtonHtml(context.meetLink) : undefined;

  if (templateContainsHtml(template)) {
    const value = renderTemplateForRichHtml(template, context, buttonToken);
    return formatSanitizedHtmlTemplate(value, meetButtonHtml, buttonToken);
  }

  const value = renderTemplateForHtml(template, context, buttonToken);
  return formatSafeRichTextHtml(value, {
    meetButtonHtml,
    buttonToken,
  });
}
