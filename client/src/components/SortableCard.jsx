import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BsThreeDots } from 'react-icons/bs';

export function SortableCard({ card, listId }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: card.id,
    data: { listId }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`board-card ${isDragging ? 'dragging' : ''}`}
    >
      <h4>{card.title}</h4>
      <div className="card-meta">
        <span className={`priority ${card.priority}`}>
          {card.priority}
        </span>
        <span className="assignee">{card.assignee}</span>
      </div>
    </div>
  );
}
    