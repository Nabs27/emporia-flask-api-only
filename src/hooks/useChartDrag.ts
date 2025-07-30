import { useState, useCallback, useEffect } from 'react';

interface DragState {
  isDragging: boolean;
  startX: number;
  startTime: Date;
  lastDirection: 'left' | 'right' | null;
  lastScrollTime: number;
}

interface UseChartDragProps {
  onDragComplete: (direction: 'left' | 'right') => void;
  threshold?: number;
  continuousScrollInterval?: number;
}

export const useChartDrag = ({ 
  onDragComplete, 
  threshold = 50,
  continuousScrollInterval = 300 
}: UseChartDragProps) => {
  const [dragState, setDragState] = useState<DragState | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    setDragState({
      isDragging: true,
      startX: e.clientX,
      startTime: new Date(),
      lastDirection: null,
      lastScrollTime: Date.now()
    });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragState?.isDragging) return;

    const deltaX = e.clientX - dragState.startX;
    
    // Empêcher la sélection de texte pendant le glissement
    e.preventDefault();
    
    // Inverser le sens du défilement avec un seuil plus élevé
    if (Math.abs(deltaX) > threshold) {
      const element = e.currentTarget as HTMLDivElement;
      // Inverser le curseur
      element.style.cursor = deltaX > 0 ? 'w-resize' : 'e-resize';
      
      const now = Date.now();
      // Ajouter un délai minimum entre les changements de direction
      if (now - dragState.lastScrollTime >= 500) {
        const newDirection = deltaX > 0 ? 'left' : 'right';
        if (newDirection !== dragState.lastDirection) {
          setDragState(prev => prev ? {
            ...prev,
            lastDirection: newDirection,
            lastScrollTime: now
          } : null);
        }
      }
    }
  }, [dragState, threshold]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragState) return;

    const deltaX = e.clientX - dragState.startX;
    
    // Réinitialiser le style du curseur
    const element = e.currentTarget as HTMLDivElement;
    element.style.cursor = 'default';

    // Augmenter le seuil pour le déclenchement final
    if (Math.abs(deltaX) >= threshold * 1.5) {
      // Inverser la direction
      onDragComplete(deltaX > 0 ? 'left' : 'right');
    }

    setDragState(null);
  }, [dragState, onDragComplete, threshold]);

  const handleMouseLeave = useCallback(() => {
    setDragState(null);
  }, []);

  // Effet pour le défilement continu avec délai minimum
  useEffect(() => {
    if (!dragState?.isDragging || !dragState.lastDirection) return;

    const intervalId = setInterval(() => {
      const now = Date.now();
      if (now - dragState.lastScrollTime >= 500) {
        onDragComplete(dragState.lastDirection!);
        setDragState(prev => prev ? {
          ...prev,
          lastScrollTime: now
        } : null);
      }
    }, continuousScrollInterval);

    return () => clearInterval(intervalId);
  }, [dragState, onDragComplete, continuousScrollInterval]);

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    isDragging: dragState?.isDragging || false
  };
}; 