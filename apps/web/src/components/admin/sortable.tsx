'use client';

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, rectSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Ordenar arrastrando (mouse, dedo o teclado). En el celular se arrastra desde la manija
 * para no pelear con el scroll.
 */
export function SortableList<T extends { id: string }>({
  items,
  onChange,
  render,
  layout = 'list',
  className,
  disabled,
}: {
  items: T[];
  onChange: (next: T[]) => void;
  render: (item: T, handle: ReactNode, index: number) => ReactNode;
  layout?: 'list' | 'grid';
  className?: string;
  disabled?: boolean;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = items.findIndex((i) => i.id === active.id);
    const to = items.findIndex((i) => i.id === over.id);
    onChange(arrayMove(items, from, to));
  };
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={layout === 'grid' ? rectSortingStrategy : verticalListSortingStrategy} disabled={disabled}>
        <ul className={className}>
          {items.map((it, i) => (
            <SortableItem key={it.id} id={it.id} disabled={disabled}>
              {(handle) => render(it, handle, i)}
            </SortableItem>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableItem({ id, children, disabled }: { id: string; children: (handle: ReactNode) => ReactNode; disabled?: boolean }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  const style: CSSProperties = { transform: CSS.Translate.toString(transform), transition, zIndex: isDragging ? 20 : undefined };
  const handle = disabled ? null : (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      className="grid size-9 shrink-0 cursor-grab touch-none place-items-center rounded-md text-slate hover:bg-black/5 hover:text-ink active:cursor-grabbing"
      aria-label="Arrastrar para ordenar"
    >
      <GripVertical className="size-4" />
    </button>
  );
  return (
    <li ref={setNodeRef} style={style} className={cn('relative', isDragging && 'opacity-90 drop-shadow-xl')}>
      {children(handle)}
    </li>
  );
}
