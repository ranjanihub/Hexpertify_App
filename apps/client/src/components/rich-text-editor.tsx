import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import {
  Bold,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Pilcrow,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Underline,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { isRichHtml, plainTextToHtml, sanitizeRichHtml } from "@/lib/rich-text";

const IMAGE_MAX_WIDTH = 1600;
const IMAGE_MAX_INPUT_BYTES = 15 * 1024 * 1024;
const IMAGE_MAX_OUTPUT_BYTES = 2 * 1024 * 1024;

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Images are embedded in the article as data URLs (like other uploads in the
 * panel), so they are scaled down to at most 1600px wide and re-encoded first.
 * GIFs are kept as-is so animations survive.
 */
async function imageToDataUrl(file: File): Promise<string> {
  if (file.type === "image/gif") return readAsDataUrl(file);

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, IMAGE_MAX_WIDTH / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  if (file.type === "image/jpeg") return canvas.toDataURL("image/jpeg", 0.85);
  // WebP keeps transparency at a fraction of PNG's size; browsers without a WebP encoder fall back to PNG.
  const webp = canvas.toDataURL("image/webp", 0.85);
  return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/png");
}

function imageFiles(list: FileList | null | undefined): File[] {
  return Array.from(list || []).filter((f) => /^image\/(png|jpeg|webp|gif)$/.test(f.type));
}

type Block = "p" | "h2" | "h3" | "blockquote";

type ToolbarState = {
  block: Block;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikeThrough: boolean;
  insertUnorderedList: boolean;
  insertOrderedList: boolean;
};

const EMPTY_STATE: ToolbarState = {
  block: "p",
  bold: false,
  italic: false,
  underline: false,
  strikeThrough: false,
  insertUnorderedList: false,
  insertOrderedList: false,
};

function toEditorHtml(value: string): string {
  if (!value) return "";
  return isRichHtml(value) ? sanitizeRichHtml(value) : plainTextToHtml(value);
}

function ToolbarButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      // mousedown keeps the text selection inside the editor
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={cn(
        "h-8 w-8 inline-flex items-center justify-center rounded-md transition-colors cursor-pointer",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      )}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

function Divider() {
  return <span className="w-px h-5 bg-border mx-1" />;
}

type RichTextEditorProps = Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "onBlur"> & {
  value: string;
  onChange: (html: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  editorClassName?: string;
  /** Shows the image button and accepts pasted / dropped pictures. */
  allowImages?: boolean;
};

function hasContent(el: HTMLElement): boolean {
  return Boolean(el.textContent?.trim() || el.querySelector("img"));
}

/**
 * Word-style editor for article bodies. Emits sanitised HTML, or "" when the
 * document has no text, so a required-field check still works.
 */
export const RichTextEditor = forwardRef<HTMLDivElement, RichTextEditorProps>(function RichTextEditor(
  { value, onChange, onBlur, placeholder, className, editorClassName, allowImages, ...rest },
  ref
) {
  const { toast } = useToast();
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const savedRange = useRef<Range | null>(null);
  const lastEmitted = useRef<string | null>(null);
  const [isEmpty, setIsEmpty] = useState(!value);
  const [isInsertingImage, setIsInsertingImage] = useState(false);
  const [state, setState] = useState<ToolbarState>(EMPTY_STATE);

  useImperativeHandle(ref, () => editorRef.current as HTMLDivElement);

  // Load outside changes (drafts, form reset) without fighting the user's typing.
  useEffect(() => {
    const el = editorRef.current;
    if (!el || value === lastEmitted.current) return;
    el.innerHTML = toEditorHtml(value);
    lastEmitted.current = value;
    setIsEmpty(!hasContent(el));
  }, [value]);

  const emit = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const filled = hasContent(el);
    const html = filled ? sanitizeRichHtml(el.innerHTML) : "";
    setIsEmpty(!filled);
    lastEmitted.current = html;
    onChange(html);
  }, [onChange]);

  const refreshState = useCallback(() => {
    const el = editorRef.current;
    const selection = document.getSelection();
    if (!el || !selection?.anchorNode || !el.contains(selection.anchorNode)) return;
    const block = String(document.queryCommandValue("formatBlock") || "p").toLowerCase();
    setState({
      block: (["h2", "h3", "blockquote"].includes(block) ? block : "p") as Block,
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      strikeThrough: document.queryCommandState("strikeThrough"),
      insertUnorderedList: document.queryCommandState("insertUnorderedList"),
      insertOrderedList: document.queryCommandState("insertOrderedList"),
    });
  }, []);

  useEffect(() => {
    document.addEventListener("selectionchange", refreshState);
    return () => document.removeEventListener("selectionchange", refreshState);
  }, [refreshState]);

  const run = useCallback(
    (command: string, arg?: string) => {
      editorRef.current?.focus();
      document.execCommand("styleWithCSS", false, "false");
      document.execCommand("defaultParagraphSeparator", false, "p");
      document.execCommand(command, false, arg);
      emit();
      refreshState();
    },
    [emit, refreshState]
  );

  const setBlock = (block: Block) => run("formatBlock", state.block === block && block !== "p" ? "<p>" : `<${block}>`);

  const addLink = () => {
    const url = window.prompt("Link address (https://…)");
    if (!url) return;
    const href = /^(https?:|mailto:)/i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
    const selection = document.getSelection();
    if (selection && selection.isCollapsed) {
      run("insertHTML", `<a href="${href.replace(/"/g, "&quot;")}">${href.replace(/</g, "&lt;")}</a>`);
    } else {
      run("createLink", href);
    }
  };

  const restoreSelection = () => {
    const el = editorRef.current;
    const selection = document.getSelection();
    let range = savedRange.current;
    if (!el) return;
    el.focus();
    if (!range || !el.contains(range.startContainer)) {
      range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
    }
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
    savedRange.current = null;
  };

  const insertImages = async (files: File[]) => {
    if (!files.length) return;
    setIsInsertingImage(true);
    try {
      const html: string[] = [];
      for (const file of files) {
        if (file.size > IMAGE_MAX_INPUT_BYTES) {
          toast({ title: "Image too large", description: `${file.name} is over 15 MB.`, variant: "destructive" });
          continue;
        }
        const src = await imageToDataUrl(file);
        if (src.length * 0.75 > IMAGE_MAX_OUTPUT_BYTES) {
          toast({ title: "Image too large", description: `${file.name} is still over 2 MB after resizing.`, variant: "destructive" });
          continue;
        }
        const alt = file.name.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").replace(/"/g, "");
        html.push(`<p><img src="${src}" alt="${alt}"></p>`);
      }
      if (html.length) {
        restoreSelection();
        run("insertHTML", html.join("") + "<p><br></p>");
      }
    } catch {
      toast({ title: "Couldn't add image", description: "That file could not be read as an image.", variant: "destructive" });
    } finally {
      savedRange.current = null;
      setIsInsertingImage(false);
    }
  };

  const pickImage = () => {
    const selection = document.getSelection();
    const el = editorRef.current;
    savedRange.current =
      selection?.rangeCount && el?.contains(selection.anchorNode) ? selection.getRangeAt(0).cloneRange() : null;
    fileInputRef.current?.click();
  };

  const tools = useMemo(
    () => [
      [
        { icon: Pilcrow, label: "Normal text", active: state.block === "p", onClick: () => setBlock("p") },
        { icon: Heading2, label: "Heading", active: state.block === "h2", onClick: () => setBlock("h2") },
        { icon: Heading3, label: "Subheading", active: state.block === "h3", onClick: () => setBlock("h3") },
      ],
      [
        { icon: Bold, label: "Bold (Ctrl+B)", active: state.bold, onClick: () => run("bold") },
        { icon: Italic, label: "Italic (Ctrl+I)", active: state.italic, onClick: () => run("italic") },
        { icon: Underline, label: "Underline (Ctrl+U)", active: state.underline, onClick: () => run("underline") },
        { icon: Strikethrough, label: "Strikethrough", active: state.strikeThrough, onClick: () => run("strikeThrough") },
      ],
      [
        { icon: List, label: "Bulleted list", active: state.insertUnorderedList, onClick: () => run("insertUnorderedList") },
        { icon: ListOrdered, label: "Numbered list", active: state.insertOrderedList, onClick: () => run("insertOrderedList") },
        { icon: Quote, label: "Quote", active: state.block === "blockquote", onClick: () => setBlock("blockquote") },
        { icon: Link2, label: "Insert link", onClick: addLink },
        ...(allowImages
          ? [{ icon: ImagePlus, label: isInsertingImage ? "Adding image…" : "Insert image", onClick: pickImage }]
          : []),
        { icon: RemoveFormatting, label: "Clear formatting", onClick: () => run("removeFormat") },
      ],
      [
        { icon: Undo2, label: "Undo (Ctrl+Z)", onClick: () => run("undo") },
        { icon: Redo2, label: "Redo (Ctrl+Y)", onClick: () => run("redo") },
      ],
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, run, allowImages, isInsertingImage]
  );

  return (
    <div
      className={cn(
        "rounded-md border border-input bg-background shadow-xs overflow-hidden focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 transition-[color,box-shadow]",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-border bg-secondary/40">
        {tools.map((group, i) => (
          <div key={i} className="flex items-center gap-0.5">
            {i > 0 && <Divider />}
            {group.map((tool) => (
              <ToolbarButton key={tool.label} {...tool} />
            ))}
          </div>
        ))}
        {isInsertingImage && <span className="ml-2 text-xs text-muted-foreground">Adding image…</span>}
        {allowImages && (
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            multiple
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => {
              const files = imageFiles(e.target.files);
              e.target.value = "";
              void insertImages(files);
            }}
          />
        )}
      </div>

      <div
        {...rest}
        ref={editorRef}
        role="textbox"
        aria-multiline="true"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        data-empty={isEmpty ? "true" : undefined}
        onInput={emit}
        onBlur={() => {
          emit();
          onBlur?.();
        }}
        onKeyUp={refreshState}
        onMouseUp={refreshState}
        onPaste={(e) => {
          // Keep the structure of text pasted from Word / Google Docs, drop its styling.
          e.preventDefault();
          const html = e.clipboardData.getData("text/html");
          const text = e.clipboardData.getData("text/plain");
          // A screenshot or copied picture arrives as a file with no HTML alongside it.
          const pastedImages = allowImages && !html ? imageFiles(e.clipboardData.files) : [];
          if (pastedImages.length) {
            const selection = document.getSelection();
            savedRange.current = selection?.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
            void insertImages(pastedImages);
            return;
          }
          const clean = html ? sanitizeRichHtml(html) : plainTextToHtml(text);
          if (clean) run("insertHTML", clean);
        }}
        onDragOver={(e) => {
          if (allowImages && e.dataTransfer.types.includes("Files")) e.preventDefault();
        }}
        onDrop={(e) => {
          const dropped = allowImages ? imageFiles(e.dataTransfer.files) : [];
          if (!dropped.length) return;
          e.preventDefault();
          savedRange.current = document.caretRangeFromPoint?.(e.clientX, e.clientY) ?? null;
          void insertImages(dropped);
        }}
        className={cn(
          "rich-content rich-editor min-h-[320px] max-h-[640px] overflow-y-auto px-5 py-4 text-[15px] leading-7 text-foreground outline-none",
          editorClassName
        )}
      />
    </div>
  );
});
