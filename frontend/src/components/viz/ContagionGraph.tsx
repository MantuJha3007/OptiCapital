/* Correlation & contagion network.

   d3-force computes the layout; React owns the DOM. The two libraries are
   kept on their own side of the line — d3 never touches an element — which
   keeps the component debuggable and lets every visual decision live in JSX.

   What the encoding means, and why each channel earns its place:
     node area      capital weight        how much money sits here
     node fill      asset class           how the book is *labelled*
     node ring      risk intensity        risk share per unit of capital;
                                          a thick ring is a sleeve punching
                                          above its allocation
     edge width     |correlation|         strength of co-movement
     edge colour    hidden vs expected    a hidden channel is a pair more
                                          correlated than their asset classes
                                          imply — the thing an allocation
                                          chart structurally cannot show
     hull           risk cluster          positions that move as one, drawn
                                          as a single body because that is
                                          what they are */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import { CLASS_META, CLUSTER_THRESHOLD, type Exposure, type Sleeve } from "../../lib/exposure";

interface GNode extends SimulationNodeDatum {
  id: string;
  sleeve: Sleeve;
}
interface GLink extends SimulationLinkDatum<GNode> {
  rho: number;
  hidden: string | null;
}

interface Transform {
  k: number;
  x: number;
  y: number;
}

interface Props {
  exposure: Exposure;
  threshold: number;
  height?: number;
  selected: string | null;
  onSelect: (id: string | null) => void;
}

/** Andrew monotone-chain convex hull. Used to draw a cluster as one body. */
function hull(points: Array<[number, number]>): Array<[number, number]> {
  if (points.length < 3) return points;
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: [number, number], a: [number, number], b: [number, number]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

  const build = (source: Array<[number, number]>) => {
    const out: Array<[number, number]> = [];
    for (const p of source) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop();
      out.push(p);
    }
    out.pop();
    return out;
  };
  return [...build(pts), ...build([...pts].reverse())];
}

export function ContagionGraph({
  exposure,
  threshold,
  height = 520,
  selected,
  onSelect,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<Simulation<GNode, GLink> | null>(null);
  const nodesRef = useRef<GNode[]>([]);
  const dragRef = useRef<{ id: string; moved: boolean } | null>(null);
  const panRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);

  const [size, setSize] = useState({ w: 800, h: height });
  const [tick, forceRender] = useState(0);
  const [hovered, setHovered] = useState<string | null>(null);
  const [transform, setTransform] = useState<Transform>({ k: 1, x: 0, y: 0 });

  const links = useMemo(
    () => exposure.edges.filter((e) => Math.abs(e.rho) >= threshold),
    [exposure.edges, threshold],
  );

  // Measure the container so the layout fills whatever space it is given.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setSize({ w: Math.max(320, r.width), h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [height]);

  // Build the simulation. Node identity is preserved across threshold changes
  // so filtering edges nudges the layout instead of restarting it.
  useEffect(() => {
    const existing = new Map(nodesRef.current.map((n) => [n.id, n]));
    const nodes: GNode[] = exposure.sleeves.map((s) => {
      const prev = existing.get(s.id);
      return prev ? Object.assign(prev, { sleeve: s }) : { id: s.id, sleeve: s };
    });
    nodesRef.current = nodes;
    const index = new Map(nodes.map((n) => [n.id, n]));

    const gLinks: GLink[] = links.map((e) => ({
      source: index.get(e.source)!,
      target: index.get(e.target)!,
      rho: e.rho,
      hidden: e.hidden,
    }));

    const sim = forceSimulation<GNode, GLink>(nodes)
      .force(
        "link",
        forceLink<GNode, GLink>(gLinks)
          .id((d) => d.id)
          // Strongly correlated pairs sit closer together: distance is the
          // primary read of the picture, so it must encode correlation. The
          // range is kept above the collision floor below, otherwise a tight
          // pair is pulled closer than its own labels can fit.
          .distance((d) => 208 - Math.abs(d.rho) * 78)
          .strength((d) => 0.12 + Math.abs(d.rho) * 0.45),
      )
      .force("charge", forceManyBody<GNode>().strength(-720).distanceMax(560))
      // Collision radius has to clear the two lines of label text under each
      // node, not just the circle. Small nodes therefore get a floor: without
      // it, low-weight sleeves sit close enough that their labels collide even
      // though the circles do not.
      .force(
        "collide",
        forceCollide<GNode>()
          .radius((d) => Math.max(radius(d.sleeve) + 26, 58))
          .strength(0.95),
      )
      .force("center", forceCenter(size.w / 2, size.h / 2))
      .force("x", forceX(size.w / 2).strength(0.03))
      .force("y", forceY(size.h / 2).strength(0.055))
      .alpha(0.9)
      .alphaDecay(0.022);

    sim.on("tick", () => {
      // Keep every node inside the frame: an unconstrained layout pushes
      // weakly-connected sleeves off the canvas where they get clipped.
      const padX = 64;
      const padY = 34;
      nodes.forEach((n) => {
        const r = radius(n.sleeve);
        n.x = Math.max(r + padX, Math.min(size.w - r - padX, n.x ?? size.w / 2));
        n.y = Math.max(r + padY, Math.min(size.h - r - padY - 22, n.y ?? size.h / 2));
      });
      forceRender((v) => v + 1);
    });
    simRef.current = sim;
    return () => {
      sim.stop();
    };
  }, [exposure.sleeves, links, size.w, size.h]);

  const nodes = nodesRef.current;
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  // Neighbourhood of the focused node drives every highlight state.
  const focus = hovered ?? selected;
  const neighbours = useMemo(() => {
    if (!focus) return null;
    const set = new Set<string>([focus]);
    links.forEach((e) => {
      if (e.source === focus) set.add(e.target);
      if (e.target === focus) set.add(e.source);
    });
    return set;
  }, [focus, links]);

  /* ── Pointer handling: node drag, background pan, wheel zoom ────────── */

  const toGraph = (clientX: number, clientY: number) => {
    const rect = wrapRef.current!.getBoundingClientRect();
    return {
      x: (clientX - rect.left - transform.x) / transform.k,
      y: (clientY - rect.top - transform.y) / transform.k,
    };
  };

  const onNodeDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { id, moved: false };
    simRef.current?.alphaTarget(0.24).restart();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (drag) {
      const node = byId.get(drag.id);
      if (node) {
        const p = toGraph(e.clientX, e.clientY);
        node.fx = p.x;
        node.fy = p.y;
        dragRef.current = { ...drag, moved: true };
      }
      return;
    }
    const pan = panRef.current;
    if (pan) {
      setTransform((t) => ({
        ...t,
        x: pan.tx + (e.clientX - pan.x),
        y: pan.ty + (e.clientY - pan.y),
      }));
    }
  };

  const endPointer = () => {
    const drag = dragRef.current;
    if (drag) {
      const node = byId.get(drag.id);
      // Release the pin so the layout can relax back into balance.
      if (node) {
        node.fx = null;
        node.fy = null;
      }
      simRef.current?.alphaTarget(0);
      // A press that never moved is a click, not a drag.
      if (!drag.moved) onSelect(selected === drag.id ? null : drag.id);
      dragRef.current = null;
    }
    panRef.current = null;
  };

  const onBackgroundDown = (e: React.PointerEvent) => {
    panRef.current = { x: e.clientX, y: e.clientY, tx: transform.x, ty: transform.y };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = wrapRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setTransform((t) => {
      const k = Math.max(0.45, Math.min(2.6, t.k * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
      const ratio = k / t.k;
      return { k, x: mx - (mx - t.x) * ratio, y: my - (my - t.y) * ratio };
    });
  };

  const reset = () => {
    setTransform({ k: 1, x: 0, y: 0 });
    nodes.forEach((n) => {
      n.fx = null;
      n.fy = null;
    });
    simRef.current?.alpha(0.75).restart();
  };

  /* ── Cluster hulls ─────────────────────────────────────────────────── */

  const hulls = useMemo(() => {
    if (threshold > CLUSTER_THRESHOLD) return [];
    return exposure.clusters
      .map((c) => {
        const pts = c.members
          .map((m) => byId.get(m))
          .filter((n): n is GNode => !!n && n.x != null && n.y != null)
          .map((n) => [n.x!, n.y!] as [number, number]);
        if (pts.length < 2) return null;
        const shape = hull(pts);
        const d =
          shape.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ") +
          (shape.length > 2 ? " Z" : "");
        return { id: c.id, d, crossClass: c.crossClass };
      })
      .filter((h): h is { id: string; d: string; crossClass: boolean } => h !== null);
    // `tick` is the dependency that matters: node positions live on mutable
    // simulation objects, so nothing else in this list changes as they move.
  }, [exposure.clusters, byId, threshold, nodes.length, tick]);

  const dim = (id: string) => (neighbours && !neighbours.has(id) ? 0.16 : 1);

  return (
    <div className="relative w-full" ref={wrapRef} style={{ height }}>
      <svg
        width={size.w}
        height={size.h}
        className="block touch-none select-none"
        style={{ cursor: panRef.current ? "grabbing" : "grab" }}
        onPointerDown={onBackgroundDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onWheel={onWheel}
        role="img"
        aria-label="Force-directed correlation network of portfolio sleeves"
      >
        <defs>
          <marker id="cg-arrow" viewBox="0 0 8 8" refX="4" refY="4" markerWidth="5" markerHeight="5">
            <circle cx="4" cy="4" r="2" fill="var(--color-fg-3)" />
          </marker>
        </defs>

        {/* Clicking empty space clears the selection */}
        <rect
          width={size.w}
          height={size.h}
          fill="transparent"
          onClick={() => onSelect(null)}
        />

        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
          {/* Cluster bodies, drawn first so everything else sits on top. The
              wide round-joined stroke inflates the hull into a soft blob and
              handles the two-node case, where the hull is only a line. */}
          {hulls.map((h) => (
            <path
              key={h.id}
              d={h.d}
              fill="none"
              stroke={h.crossClass ? "rgb(var(--regime-rgb) / 1)" : "var(--color-fg-3)"}
              strokeOpacity={h.crossClass ? 0.09 : 0.05}
              strokeWidth={70}
              strokeLinejoin="round"
              strokeLinecap="round"
              style={{ pointerEvents: "none" }}
            />
          ))}

          {/* Edges */}
          {links.map((e) => {
            const a = byId.get(e.source);
            const b = byId.get(e.target);
            if (!a?.x || !b?.x) return null;
            const active = !neighbours || (neighbours.has(e.source) && neighbours.has(e.target));
            const strong = e.rho >= CLUSTER_THRESHOLD;
            return (
              <line
                key={`${e.source}-${e.target}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={
                  e.hidden
                    ? "var(--regime)"
                    : e.rho < 0
                      ? "var(--color-ac-gov)"
                      : "var(--color-fg-3)"
                }
                strokeWidth={Math.max(0.7, Math.abs(e.rho) * (strong ? 3.4 : 2))}
                strokeOpacity={(active ? 1 : 0.08) * (e.hidden ? 0.85 : strong ? 0.42 : 0.24)}
                strokeDasharray={e.rho < 0 ? "3 3" : undefined}
                style={{ transition: "stroke-opacity .18s ease" }}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((n) => {
            if (n.x == null || n.y == null) return null;
            const s = n.sleeve;
            const r = radius(s);
            const isFocus = focus === n.id;
            const isSelected = selected === n.id;
            const opacity = dim(n.id);
            // Ring thickness encodes risk intensity: how hard this sleeve
            // works per rupee of capital.
            const ring = Math.max(1, Math.min(7, (s.intensity - 1) * 6));
            const hot = s.intensity > 1.15;

            return (
              <g
                key={n.id}
                transform={`translate(${n.x},${n.y})`}
                opacity={opacity}
                style={{ cursor: "pointer", transition: "opacity .18s ease" }}
                onPointerDown={(e) => onNodeDown(e, n.id)}
                onPointerEnter={() => setHovered(n.id)}
                onPointerLeave={() => setHovered(null)}
              >
                {isSelected && (
                  <circle r={r + 9} fill="none" stroke="var(--regime)" strokeWidth={1} opacity={0.7} />
                )}
                {hot && (
                  <circle
                    r={r + ring / 2}
                    fill="none"
                    stroke="var(--color-crisis)"
                    strokeWidth={ring}
                    opacity={0.34}
                  />
                )}
                <circle
                  r={r}
                  fill={CLASS_META[s.cls].color}
                  fillOpacity={0.82}
                  stroke={isFocus ? "var(--color-fg)" : "var(--color-ink-900)"}
                  strokeWidth={isFocus ? 1.6 : 1.2}
                />
                {/* The name is always shown; the figures appear on focus.
                    Printing both for every node produces a wall of text that
                    collides as soon as two sleeves sit close together, and
                    buries the shape of the network under its own labels. */}
                <text
                  y={r + 13}
                  textAnchor="middle"
                  className="num"
                  fontSize={10}
                  fontWeight={isFocus ? 600 : 400}
                  fill={isFocus ? "var(--color-fg)" : "var(--color-fg-2)"}
                  style={{ pointerEvents: "none" }}
                >
                  {s.name}
                </text>
                {isFocus && (
                  <text
                    y={r + 24}
                    textAnchor="middle"
                    className="num"
                    fontSize={9.5}
                    fill="var(--color-fg-3)"
                    style={{ pointerEvents: "none" }}
                  >
                    {(s.weight * 100).toFixed(1)}% cap · {(s.riskShare * 100).toFixed(1)}% risk
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      <button className="btn btn-quiet absolute right-2 top-2 text-[11px]" onClick={reset}>
        Reset layout
      </button>
    </div>
  );
}

/** Node area is proportional to capital weight, so area reads as money. */
function radius(s: Sleeve): number {
  return 9 + Math.sqrt(s.weight) * 52;
}
