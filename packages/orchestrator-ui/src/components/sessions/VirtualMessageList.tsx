import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { DisplayMessage, WebSessionMessage, ConnectedSession } from '@claude-orchestrator/shared';
import { MessageItem, WebSessionMessageItem } from './MessageItem';

interface VirtualMessageListProps {
  messages: DisplayMessage[] | WebSessionMessage[];
  connectedSession?: ConnectedSession;
  itemHeight?: number;
  overscan?: number;
  className?: string;
}

interface VirtualItem {
  index: number;
  start: number;
  size: number;
}

const DEFAULT_ITEM_HEIGHT = 80;
const DEFAULT_OVERSCAN = 5;

export function VirtualMessageList({
  messages,
  connectedSession,
  itemHeight = DEFAULT_ITEM_HEIGHT,
  overscan = DEFAULT_OVERSCAN,
  className = '',
}: VirtualMessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measurementCacheRef = useRef<Map<number, number>>(new Map());
  const itemRefsRef = useRef<Map<number, HTMLDivElement>>(new Map());
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastScrollTopRef = useRef(0);
  const shouldAutoScrollRef = useRef(true);

  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  // Use connected session messages if available
  const displayMessages = connectedSession?.messages || messages;
  const isConnected = !!connectedSession;

  // Calculate total height and virtual items
  const { totalHeight, virtualItems, startIndex, endIndex } = useMemo(() => {
    let currentOffset = 0;
    const items: VirtualItem[] = [];

    for (let i = 0; i < displayMessages.length; i++) {
      const measuredHeight = measurementCacheRef.current.get(i);
      const height = measuredHeight || itemHeight;

      items.push({
        index: i,
        start: currentOffset,
        size: height,
      });

      currentOffset += height;
    }

    // Calculate visible range
    const scrollStart = scrollTop;
    const scrollEnd = scrollTop + containerHeight;

    let start = 0;
    let end = items.length;

    // Binary search for start index
    let left = 0;
    let right = items.length - 1;
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const item = items[mid];
      if (item.start < scrollStart) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    start = Math.max(0, right);

    // Binary search for end index
    left = start;
    right = items.length - 1;
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const item = items[mid];
      if (item.start + item.size <= scrollEnd) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    end = Math.min(items.length, left + 1);

    // Apply overscan
    const startWithOverscan = Math.max(0, start - overscan);
    const endWithOverscan = Math.min(items.length, end + overscan);

    return {
      totalHeight: currentOffset,
      virtualItems: items.slice(startWithOverscan, endWithOverscan),
      startIndex: startWithOverscan,
      endIndex: endWithOverscan,
    };
  }, [displayMessages.length, scrollTop, containerHeight, itemHeight, overscan]);

  // Handle scroll events with RAF throttling
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      if (!containerRef.current) return;

      const newScrollTop = containerRef.current.scrollTop;
      const maxScroll = containerRef.current.scrollHeight - containerRef.current.clientHeight;

      // Check if user is at bottom (within 50px threshold)
      const isAtBottom = maxScroll - newScrollTop < 50;
      shouldAutoScrollRef.current = isAtBottom;

      lastScrollTopRef.current = newScrollTop;
      setScrollTop(newScrollTop);
    });
  }, []);

  // Measure item heights using ResizeObserver
  useEffect(() => {
    if (!resizeObserverRef.current) {
      resizeObserverRef.current = new ResizeObserver((entries) => {
        let hasChanges = false;

        entries.forEach((entry) => {
          const index = Number(entry.target.getAttribute('data-index'));
          if (isNaN(index)) return;

          const height = entry.contentRect.height;
          const cachedHeight = measurementCacheRef.current.get(index);

          if (cachedHeight !== height) {
            measurementCacheRef.current.set(index, height);
            hasChanges = true;
          }
        });

        if (hasChanges) {
          // Force recalculation of virtual items
          setScrollTop((prev) => prev);
        }
      });
    }

    // Observe all current item refs
    itemRefsRef.current.forEach((element) => {
      resizeObserverRef.current?.observe(element);
    });

    return () => {
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
    };
  }, [virtualItems]);

  // Update container height on resize
  useEffect(() => {
    const updateContainerHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };

    updateContainerHeight();
    window.addEventListener('resize', updateContainerHeight);

    return () => {
      window.removeEventListener('resize', updateContainerHeight);
    };
  }, []);

  // Auto-scroll to bottom for new messages
  useEffect(() => {
    if (!containerRef.current) return;

    if (shouldAutoScrollRef.current) {
      const scrollToBottom = () => {
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
      };

      // Use RAF to ensure DOM has updated
      requestAnimationFrame(scrollToBottom);
    }
  }, [displayMessages.length, connectedSession?.messages]);

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  // Set item ref and ensure ResizeObserver is attached
  const setItemRef = useCallback((index: number, element: HTMLDivElement | null) => {
    if (element) {
      itemRefsRef.current.set(index, element);
      resizeObserverRef.current?.observe(element);
    } else {
      const oldElement = itemRefsRef.current.get(index);
      if (oldElement) {
        resizeObserverRef.current?.unobserve(oldElement);
        itemRefsRef.current.delete(index);
      }
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className={`flex-1 overflow-y-auto font-mono text-sm min-h-0 p-4 ${className}`}
      onScroll={handleScroll}
      style={{ position: 'relative' }}
    >
      {/* Empty state for connected sessions */}
      {isConnected && displayMessages.length === 0 && connectedSession?.status === 'active' && (
        <div className="text-gray-500 text-center py-8">
          <div className="text-3xl mb-2">💬</div>
          <div>Send a message to start</div>
        </div>
      )}

      {/* Total height placeholder */}
      {displayMessages.length > 0 && (
        <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
          {/* Render only visible items */}
          {virtualItems.map((virtualItem) => {
            const msg = displayMessages[virtualItem.index];
            const key = isConnected ? virtualItem.index : (msg as DisplayMessage).id;

            return (
              <div
                key={key}
                ref={(el) => setItemRef(virtualItem.index, el)}
                data-index={virtualItem.index}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
                className={isConnected ? 'mb-2' : 'border-b border-white/5 mb-2 pb-2'}
              >
                {isConnected ? (
                  <WebSessionMessageItem message={msg as WebSessionMessage} />
                ) : (
                  <MessageItem message={msg as DisplayMessage} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
