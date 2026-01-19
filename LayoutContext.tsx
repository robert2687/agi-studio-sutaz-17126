
import React, { createContext, useContext, useState, useEffect } from 'react';
import { LayoutConfig } from './types';

interface LayoutContextType
{
  config: LayoutConfig;
  updateWidth: ( panelId: string, delta: number ) => void;
  toggleCollapse: ( panelId: string ) => void;
  reorderPanels: ( draggedId: string, targetId: string ) => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>( undefined );

const DEFAULT_CONFIG: LayoutConfig = {
  order: [ 'pipeline', 'surface', 'logs' ],
  widths: { pipeline: 25, surface: 50, logs: 25 },
  collapsed: { pipeline: false, surface: false, logs: false }
};

export const LayoutProvider: React.FC<{ children: React.ReactNode }> = ( { children } ) =>
{
  const [ config, setConfig ] = useState<LayoutConfig>( () =>
  {
    const saved = localStorage.getItem( 'asp_layout_v2' );
    return saved ? JSON.parse( saved ) : DEFAULT_CONFIG;
  } );

  useEffect( () =>
  {
    localStorage.setItem( 'asp_layout_v2', JSON.stringify( config ) );
  }, [ config ] );

  const updateWidth = ( panelId: string, delta: number ) =>
  {
    setConfig( ( prev: LayoutConfig ) =>
    {
      const idx = prev.order.indexOf( panelId );
      if ( idx === -1 || idx === prev.order.length - 1 ) return prev;

      const nextId = prev.order[ idx + 1 ];
      const newWidth = Math.max( 10, Math.min( 80, prev.widths[ panelId ] + delta ) );
      const nextNewWidth = prev.widths[ panelId ] + prev.widths[ nextId ] - newWidth;

      if ( nextNewWidth < 10 ) return prev;

      return {
        ...prev,
        widths: { ...prev.widths, [ panelId ]: newWidth, [ nextId ]: nextNewWidth }
      };
    } );
  };

  const toggleCollapse = ( panelId: string ) =>
  {
    setConfig( ( prev: LayoutConfig ) => ( {
      ...prev,
      collapsed: { ...prev.collapsed, [ panelId ]: !prev.collapsed[ panelId ] }
    } ) );
  };

  const reorderPanels = ( draggedId: string, targetId: string ) =>
  {
    setConfig( ( prev: LayoutConfig ) =>
    {
      const newOrder = [ ...prev.order ];
      const draggedIdx = newOrder.indexOf( draggedId );
      const targetIdx = newOrder.indexOf( targetId );
      newOrder.splice( draggedIdx, 1 );
      newOrder.splice( targetIdx, 0, draggedId );
      return { ...prev, order: newOrder };
    } );
  };

  return (
    <LayoutContext.Provider value={ { config, updateWidth, toggleCollapse, reorderPanels } }>
      { children }
    </LayoutContext.Provider>
  );
};

export const useLayout = () =>
{
  const context = useContext( LayoutContext );
  if ( !context ) throw new Error( 'useLayout must be used within LayoutProvider' );
  return context;
};
