import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext'; // Import useTheme

// Make sure Toast UI Editor is available globally via CDN
declare global {
  interface Window {
    toastui: {
      Editor: new (options: any) => any;
    };
  }
}

interface MarkdownEditorProps {
  initialValue: string;
  onChange: (markdown: string) => void;
  height?: string;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ initialValue, onChange, height = '400px' }) => {
  const { theme } = useTheme();
  const editorInstanceRef = useRef<any>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const isEditorInitialized = useRef(false);

  // Effect for initializing and destroying the editor
  useEffect(() => {
    if (!editorContainerRef.current || !window.toastui || !window.toastui.Editor) {
      return;
    }

    // Destroy previous instance if theme changes to ensure it's re-rendered correctly
    if (editorInstanceRef.current) {
        editorInstanceRef.current.destroy();
        editorInstanceRef.current = null;
        isEditorInitialized.current = false;
    }

    if (!isEditorInitialized.current) {
      const instance = new window.toastui.Editor({
        el: editorContainerRef.current,
        height: height,
        initialEditType: 'wysiwyg',
        previewStyle: 'vertical',
        initialValue: initialValue,
        theme: theme, // Use theme from context
        events: {
          change: () => {
            if (editorInstanceRef.current) {
              onChange(editorInstanceRef.current.getMarkdown());
            }
          },
        },
      });
      editorInstanceRef.current = instance;
      isEditorInitialized.current = true;
    }
    
    return () => {
      if (editorInstanceRef.current) {
        editorInstanceRef.current.destroy();
        editorInstanceRef.current = null;
      }
      isEditorInitialized.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height, theme, initialValue]); // Rerun if theme changes

  // This separate effect handles dynamic content changes without re-initializing the editor
  useEffect(() => {
    if (editorInstanceRef.current && isEditorInitialized.current) {
      const currentMarkdownInEditor = editorInstanceRef.current.getMarkdown();
      if (currentMarkdownInEditor !== initialValue) {
        // Use setMarkdown instead of re-initializing
        editorInstanceRef.current.setMarkdown(initialValue, false); // false to not trigger change event
      }
    }
  }, [initialValue]);


  return (
    <>
      <style>{`
        /* Override TUI's default background for consistency with our theme */
        .toastui-editor-defaultUI {
          border-color: var(--brand-border) !important;
        }
        .toastui-editor-toolbar {
          background-color: var(--brand-surface) !important;
          border-bottom-color: var(--brand-border) !important;
        }
        .toastui-editor-md-container, .toastui-editor-ww-container {
          background-color: var(--brand-card) !important;
        }
        .toastui-editor-mode-switch {
          background-color: var(--brand-background) !important;
          border-bottom-color: var(--brand-border) !important;
        }
        /* Ensure text color has good contrast */
        .toastui-editor-contents, .toastui-editor-md-preview .toastui-editor-contents {
          color: var(--brand-text-primary) !important;
        }
        .dark .toastui-editor-contents *, .dark .toastui-editor-md-preview .toastui-editor-contents * {
            color: var(--brand-text-primary);
        }
      `}</style>
      <div ref={editorContainerRef} className="toastui-editor-container" />
    </>
  );
};

export default MarkdownEditor;
