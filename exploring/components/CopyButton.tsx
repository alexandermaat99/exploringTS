"use client";

import { useState, useCallback, memo } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "./ui/button";

interface CopyButtonProps {
  text: string;
  className?: string;
}

const CopyButton = memo(({ text, className = "" }: CopyButtonProps) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  }, [text]);

  return (
    <Button
      onClick={copyToClipboard}
      variant="outline"
      size="sm"
      className={`ml-2 ${className}`}
      disabled={copied}
    >
      {copied ? (
        <>
          <Check className="w-4 h-4 mr-1" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="w-4 h-4 mr-1" />
          Copy
        </>
      )}
    </Button>
  );
});

CopyButton.displayName = "CopyButton";

export default CopyButton;
