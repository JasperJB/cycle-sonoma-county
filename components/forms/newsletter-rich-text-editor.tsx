"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  Bold,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NewsletterRichTextEditorProps = {
  id?: string;
  name?: string;
  label?: string;
  rows?: number;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
};

function isEffectivelyEmptyHtml(value: string) {
  const normalized = value
    .replace(/<br\s*\/?>/gi, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/<p>\s*<\/p>/gi, "")
    .replace(/<div>\s*<\/div>/gi, "")
    .replace(/<[^>]+>/g, "")
    .trim();

  return normalized.length === 0;
}

function normalizeEditorHtml(value: string) {
  if (!value.trim()) {
    return "";
  }

  if (value === "<br>" || value === "<div><br></div>") {
    return "";
  }

  return value;
}

function escapeAttribute(value: string) {
  return value.replace(/"/g, "&quot;");
}

function editorMinHeight(rows: number) {
  return `${Math.max(rows, 4) * 1.6}rem`;
}

function ToolbarButton({
  disabled,
  onActivate,
  children,
}: {
  disabled?: boolean;
  onActivate: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className="rounded-2xl px-3"
      disabled={disabled}
      onMouseDown={(event) => {
        event.preventDefault();
        onActivate();
      }}
    >
      {children}
    </Button>
  );
}

export function NewsletterRichTextEditor({
  id,
  name,
  label = "Newsletter content",
  rows = 8,
  placeholder,
  disabled,
  className,
  value,
  defaultValue = "",
  onChange,
}: NewsletterRichTextEditorProps) {
  const generatedId = useId();
  const editorId = id || `newsletter-editor-${generatedId}`;
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [internalValue, setInternalValue] = useState(defaultValue);
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;
  const isEmpty = isEffectivelyEmptyHtml(currentValue);

  const commitValue = (nextValue: string) => {
    const normalized = normalizeEditorHtml(nextValue);

    if (!isControlled) {
      setInternalValue(normalized);
    }

    onChange?.(normalized);
  };

  useEffect(() => {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    if (editor.innerHTML !== currentValue) {
      editor.innerHTML = currentValue || "";
    }
  }, [currentValue]);

  const focusEditor = () => {
    editorRef.current?.focus();
  };

  const exec = (command: string, valueArg?: string) => {
    focusEditor();
    document.execCommand(command, false, valueArg);
    commitValue(editorRef.current?.innerHTML || "");
  };

  const insertLink = () => {
    const href = window.prompt("Enter the link URL", "https://");

    if (!href) {
      return;
    }

    const selection = window.getSelection();
    const selectedText = selection?.toString().trim() || "";

    if (selectedText) {
      exec("createLink", href.trim());
      return;
    }

    const linkText = window.prompt("Enter the link text", "Read more") || "Read more";
    exec(
      "insertHTML",
      `<a href="${escapeAttribute(href.trim())}">${linkText}</a>`,
    );
  };

  const insertImage = () => {
    const src = window.prompt("Enter the public image URL", "https://");

    if (!src) {
      return;
    }

    const alt = window.prompt("Enter alt text for the image", "") || "";
    exec(
      "insertHTML",
      `<p><img src="${escapeAttribute(src.trim())}" alt="${escapeAttribute(alt.trim())}" /></p>`,
    );
  };

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-[var(--color-pine)]">{label}</span>
        <span className="text-xs text-[var(--color-forest-muted)]">
          Supports headings, bold, italics, lists, links, and images by URL.
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <ToolbarButton disabled={disabled} onActivate={() => exec("bold")}>
          <Bold className="mr-2 h-4 w-4" />
          Bold
        </ToolbarButton>
        <ToolbarButton disabled={disabled} onActivate={() => exec("italic")}>
          <Italic className="mr-2 h-4 w-4" />
          Italic
        </ToolbarButton>
        <ToolbarButton disabled={disabled} onActivate={() => exec("formatBlock", "<h3>")}>
          <Heading3 className="mr-2 h-4 w-4" />
          Heading
        </ToolbarButton>
        <ToolbarButton disabled={disabled} onActivate={() => exec("insertUnorderedList")}>
          <List className="mr-2 h-4 w-4" />
          List
        </ToolbarButton>
        <ToolbarButton disabled={disabled} onActivate={insertLink}>
          <LinkIcon className="mr-2 h-4 w-4" />
          Link
        </ToolbarButton>
        <ToolbarButton disabled={disabled} onActivate={insertImage}>
          <ImageIcon className="mr-2 h-4 w-4" />
          Image
        </ToolbarButton>
      </div>

      <div className="relative">
        {isEmpty && placeholder ? (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-4 py-3 text-sm text-[var(--color-forest-muted)]">
            {placeholder}
          </div>
        ) : null}
        <div
          ref={editorRef}
          id={editorId}
          contentEditable={!disabled}
          suppressContentEditableWarning
          className={cn(
            "newsletter-rich-editor min-h-32 w-full rounded-2xl border border-input bg-transparent px-4 py-3 text-sm leading-7 text-[var(--color-pine)] outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed",
            disabled ? "cursor-not-allowed bg-input/50 opacity-70" : "bg-white/90",
            className,
          )}
          style={{ minHeight: editorMinHeight(rows) }}
          onInput={(event) => commitValue((event.currentTarget as HTMLDivElement).innerHTML)}
          onBlur={(event) => commitValue((event.currentTarget as HTMLDivElement).innerHTML)}
        />
      </div>

      {name ? <textarea hidden readOnly name={name} value={currentValue} /> : null}

      <p className="text-xs leading-5 text-[var(--color-forest-muted)]">
        Images must use a public URL. Relative site paths like `/uploads/...` also work if the
        image is already public on this site.
      </p>
    </div>
  );
}
