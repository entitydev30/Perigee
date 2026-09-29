"use client";

import { useEffect, useRef } from "react";
import { logger } from "../lib/logger";
import { sanitizeSvg } from "../lib/sanitize";

interface MermaidProps {
  /**
   * Mermaid diagram definition (e.g. a flowchart). When omitted the figure
   * renders an empty container for the caller to caption.
   */
  chart?: string;
}

/**
 * Minimal Mermaid renderer.
 *
 * Follows the same lazy-import + sanitized-SVG pattern as
 * `CallGraphVisualizer` so the (heavy) `mermaid` package is never part of the
 * initial bundle and rendered markup always passes through `sanitizeSvg`.
 */
export default function Mermaid({ chart }: MermaidProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    const renderMermaid = async () => {
      if (!containerRef.current || !chart) return;

      try {
        const mermaidModule = await import("mermaid");
        const mermaid = mermaidModule.default || mermaidModule;
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          securityLevel: "loose",
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
            curve: "basis",
          },
        });

        if (!isMounted || !containerRef.current) return;
        containerRef.current.innerHTML = "";
        const id = `mermaid-diagram-${Math.random().toString(36).slice(2, 9)}`;
        const { svg } = await mermaid.render(id, chart);
        if (isMounted && containerRef.current) {
          containerRef.current.innerHTML = sanitizeSvg(svg);
        }
      } catch (error) {
        logger.error("Mermaid rendering failed:", error);
      }
    };

    renderMermaid();

    return () => {
      isMounted = false;
    };
  }, [chart]);

  return <div ref={containerRef} role={chart ? "img" : undefined} />;
}
