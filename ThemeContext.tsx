
import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeMode } from './types';

interface ThemeContextType
{
  theme: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>( undefined );

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ( { children } ) =>
{
  const [ theme, setTheme ] = useState<ThemeMode>( () =>
  {
    return ( localStorage.getItem( 'asp_theme' ) as ThemeMode ) || 'dark';
  } );

  useEffect( () =>
  {
    localStorage.setItem( 'asp_theme', theme );
    if ( theme === 'dark' )
    {
      document.documentElement.classList.add( 'dark' );
    } else
    {
      document.documentElement.classList.remove( 'dark' );
    }
  }, [ theme ] );

  const toggleTheme = () => setTheme( ( prev: ThemeMode ) => prev === 'dark' ? 'light' : 'dark' );

  return (
    <ThemeContext.Provider value={ { theme, toggleTheme } }>
      <div className={ `${ theme === 'dark' ? 'bg-[#02040a]' : 'bg-[#f8fafc]' } text-slate-100 transition-colors duration-300 min-h-screen` }>
        { children }
      </div>
    </ThemeContext.Provider>
  );
};

export const useTheme = () =>
{
  const context = useContext( ThemeContext );
  if ( !context ) throw new Error( 'useTheme must be used within ThemeProvider' );
  return context;
};
