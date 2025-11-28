import React, { useMemo } from 'react';

declare global {
  interface Window {
    marked: {
      parse: (markdown: string, options?: any) => string;
    };
    DOMPurify: {
      sanitize: (html: string, options?: any) => string;
    };
  }
}

interface MarkdownDisplayProps {
  markdown: string;
  className?: string;
}

const MarkdownDisplay: React.FC<MarkdownDisplayProps> = ({ markdown, className = '' }) => {
  const sanitizedHtml = useMemo(() => {
    if (typeof window !== 'undefined' && window.marked && window.DOMPurify) {
      const rawHtml = window.marked.parse(markdown || '', { gfm: true, breaks: true });
      return window.DOMPurify.sanitize(rawHtml);
    }
    // Return a safe fallback if libraries aren't loaded
    return `<p>${markdown.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`;
  }, [markdown]);

  return (
    <div
      className={`prose prose-sm md:prose-base prose-invert max-w-none custom-styled-html ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
};

export default MarkdownDisplay;
