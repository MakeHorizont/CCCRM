
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useView } from '../hooks/useView';
import { MobileNavItemConfig, IconComponents, MENU_ITEMS, MOBILE_NAV_CATEGORY_COLORS, MOBILE_NAV_CATEGORY_TEXT_COLORS } from '../constants';
import Card from './UI/Card';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, type DragStartEvent, type DragEndEvent, DragOverlay, type UniqueIdentifier } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Bars2Icon } from './UI/Icons';

interface NavButtonProps {
  config: MobileNavItemConfig;
  isLocked: boolean;
  isOverlay?: boolean;
}

const NavButton: React.FC<NavButtonProps> = ({ config, isLocked, isOverlay = false }) => {
  const IconComponent = IconComponents[config.iconName as keyof typeof IconComponents] || IconComponents.HomeIcon;
  const textColorClass = config.textColorClass || 'text-brand-text-primary';

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: config.id, disabled: isLocked || isOverlay });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition || undefined,
    opacity: isDragging && !isOverlay ? 0.5 : 1,
    cursor: isOverlay ? 'grabbing' : (isLocked ? 'default' : 'grab'),
    touchAction: 'none',
  };
  
  const commonCardClasses = "h-full flex flex-col items-center justify-center !p-3 text-center bg-transparent shadow-none relative";
  const linkClasses = `block p-0 rounded-lg shadow-md transform transition-transform focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary ${
    isLocked ? '' : 'hover:scale-105'
  } ${config.colorClass || 'bg-brand-secondary hover:bg-brand-secondary-hover'}`;


  if (isOverlay) {
    return (
       <div className={`${linkClasses} opacity-75`} style={{ width: '150px', height: '120px' }}>
         <Card className={commonCardClasses}>
            <IconComponent className={`h-8 w-8 ${textColorClass} mb-1.5`} />
            <span className={`text-xs font-medium ${textColorClass} truncate w-full`}>{config.label}</span>
        </Card>
       </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="outline-none">
      <Link to={config.path || '#'} className={linkClasses}>
        <Card className={commonCardClasses}>
           {!isLocked && (
            <button {...listeners} className={`absolute top-1 right-1 p-0.5 ${textColorClass} opacity-70 hover:opacity-100 cursor-grab active:cursor-grabbing`} aria-label="Переместить">
              <Bars2Icon className="h-3 w-3"/>
            </button>
          )}
          <IconComponent className={`h-8 w-8 ${textColorClass} mb-1.5`} />
          <span className={`text-xs font-medium ${textColorClass} truncate w-full`} title={config.label}>{config.label}</span>
        </Card>
      </Link>
    </div>
  );
};

const MobileHomePage: React.FC = () => {
  const { mobileNavItemsConfig, setMobileNavItemsConfig, isMobileNavLocked } = useView();
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
  };
  
  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = mobileNavItemsConfig.findIndex((item) => item.id === active.id);
      const newIndex = mobileNavItemsConfig.findIndex((item) => item.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newConfig = arrayMove(mobileNavItemsConfig, oldIndex, newIndex);
        setMobileNavItemsConfig(newConfig);
      }
    }
  };
  
  const visibleItems = useMemo(() => mobileNavItemsConfig.filter(item => item.isVisible), [mobileNavItemsConfig]);
  
  const categorizedNav = useMemo(() => {
    const categories: { name: string; items: MobileNavItemConfig[] }[] = [];
    let currentCategory: { name: string; items: MobileNavItemConfig[] } | null = null;
    
    MENU_ITEMS.forEach(menuItem => {
        if (menuItem.isHeader) {
            currentCategory = { name: menuItem.name, items: [] };
            categories.push(currentCategory);
        } else {
             if (!currentCategory) {
                const mainCategory = categories.find(c => c.name === 'Основные');
                if (mainCategory) {
                    currentCategory = mainCategory;
                } else {
                    currentCategory = { name: 'Основные', items: [] };
                    categories.unshift(currentCategory);
                }
            }

            if (menuItem.isParent && menuItem.subMenu) {
                menuItem.subMenu.forEach(sub => {
                    const navItem = visibleItems.find(m => m.id === sub.path);
                    if (navItem) currentCategory!.items.push(navItem);
                });
            } else if (menuItem.path) {
                const navItem = visibleItems.find(m => m.id === menuItem.path);
                if (navItem) currentCategory!.items.push(navItem);
            }
        }
    });

    return categories.map(category => {
        const categoryItemIds = new Set(category.items.map(i => i.id));
        const orderedItems = visibleItems.filter(item => categoryItemIds.has(item.id));
        return { ...category, items: orderedItems };
    }).filter(cat => cat.items.length > 0);

  }, [visibleItems]);
  
  const draggedItem = activeId ? visibleItems.find(item => item.id === activeId) : null;
  const draggedItemCategory = draggedItem ? categorizedNav.find(c => c.items.some(i => i.id === activeId))?.name : null;


  return (
    <div className="p-2 space-y-3">
      <h1 className="text-xl font-semibold text-brand-text-primary text-center mb-3">CCCRM Mobile</h1>
      
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setActiveId(null)}>
        <SortableContext items={visibleItems.map(item => item.id)} strategy={rectSortingStrategy} disabled={isMobileNavLocked}>
          <div className="space-y-6">
            {categorizedNav.map(category => (
              <div key={category.name}>
                <h2 className="text-lg font-semibold text-brand-text-secondary px-2">{category.name}</h2>
                <div className="grid grid-cols-2 xs:grid-cols-3 gap-3 mt-1">
                  {category.items.map(itemConfig => (
                    <NavButton
                      key={itemConfig.id}
                      config={{
                        ...itemConfig,
                        colorClass: MOBILE_NAV_CATEGORY_COLORS[category.name] || MOBILE_NAV_CATEGORY_COLORS.default,
                        textColorClass: MOBILE_NAV_CATEGORY_TEXT_COLORS[category.name] || MOBILE_NAV_CATEGORY_TEXT_COLORS.default,
                      }}
                      isLocked={isMobileNavLocked}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SortableContext>
        <DragOverlay dropAnimation={null}>
            {draggedItem ? (
                <NavButton 
                    config={{
                        ...draggedItem, 
                        colorClass: draggedItemCategory ? MOBILE_NAV_CATEGORY_COLORS[draggedItemCategory] : MOBILE_NAV_CATEGORY_COLORS.default,
                        textColorClass: draggedItemCategory ? MOBILE_NAV_CATEGORY_TEXT_COLORS[draggedItemCategory] : MOBILE_NAV_CATEGORY_TEXT_COLORS.default,
                    }} 
                    isLocked={true} 
                    isOverlay={true} 
                />
            ) : null}
        </DragOverlay>
      </DndContext>

      {isMobileNavLocked && (
         <p className="text-xs text-brand-text-muted text-center mt-4">
            Порядок кнопок заблокирован. Для изменения разблокируйте в настройках меню.
        </p>
      )}
       {!isMobileNavLocked && visibleItems.length > 0 && (
         <p className="text-xs text-brand-text-muted text-center mt-4">
            Для изменения порядка, перетащите кнопки.
        </p>
      )}
      {visibleItems.length === 0 && (
         <p className="text-sm text-brand-text-muted text-center mt-6">
            Все пункты меню скрыты. Вы можете включить их в настройках мобильного меню (иконка шестеренки вверху).
        </p>
      )}
    </div>
  );
};

export default MobileHomePage;