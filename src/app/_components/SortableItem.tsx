import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type SortableItemProps = {
    id: number;
    children: React.ReactNode;
};

export function SortableItem({ id, children }: SortableItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            {...attributes} 
            {...listeners}
            className="p-3 m-1 border border-gray-200 rounded-lg bg-white cursor-pointer hover:bg-gray-50 transition-colors shadow-sm hover:shadow-md"
        >
            {children}
        </div>
    );
}
