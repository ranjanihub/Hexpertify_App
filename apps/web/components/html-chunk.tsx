"use client"; // 👈 Important!

import React from "react";
import MDEditor from "@uiw/react-md-editor";

import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";

interface Props {
  content: string; // This is the string from your DB
}

export default function MarkdownViewer({ content }: Props) {
  return (
    <div data-color-mode="light">
      {" "}
      {/* Force light or dark mode here */}
      <MDEditor.Markdown source={content} style={{ whiteSpace: "pre-wrap" }} />
    </div>
  );
}
