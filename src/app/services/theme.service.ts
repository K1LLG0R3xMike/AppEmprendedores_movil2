import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private darkModeKey = 'darkMode';
  private isDarkMode: boolean = false;

  constructor() {
    this.initializeTheme();
  }

  async initializeTheme(): Promise<void> {
    try {
      // Intentar obtener la preferencia guardada
      const { value } = await Preferences.get({ key: this.darkModeKey });
      
      if (value !== null) {
        this.isDarkMode = JSON.parse(value);
      } else {
        // Si no hay preferencia guardada, usar la preferencia del sistema
        this.isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      
      this.applyTheme();
    } catch (error) {
      console.error('Error initializing theme:', error);
      // Fallback a preferencia del sistema
      this.isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.applyTheme();
    }
  }

  async toggleDarkMode(): Promise<void> {
    this.isDarkMode = !this.isDarkMode;
    
    try {
      // Guardar la preferencia
      await Preferences.set({
        key: this.darkModeKey,
        value: JSON.stringify(this.isDarkMode)
      });
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
    
    this.applyTheme();
  }

  async setDarkMode(isDark: boolean): Promise<void> {
    console.log('setDarkMode called with:', isDark);
    this.isDarkMode = isDark;
    
    try {
      await Preferences.set({
        key: this.darkModeKey,
        value: JSON.stringify(this.isDarkMode)
      });
      console.log('Theme preference saved:', this.isDarkMode);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
    
    this.applyTheme();
  }

  getDarkMode(): boolean {
    return this.isDarkMode;
  }

  private applyTheme(): void {
    console.log('applyTheme called. isDarkMode:', this.isDarkMode);
    console.log('Body classes before:', document.body.classList.toString());
    
    document.body.classList.toggle('dark', this.isDarkMode);
    
    // También aplicar al elemento html para mayor compatibilidad
    document.documentElement.classList.toggle('dark', this.isDarkMode);
    
    console.log('Body classes after:', document.body.classList.toString());
    console.log('HTML classes after:', document.documentElement.classList.toString());
    
    // Actualizar la meta tag de color de la barra de estado
    this.updateStatusBarColor();
    
    console.log('Theme applied:', this.isDarkMode ? 'dark' : 'light');
  }

  private updateStatusBarColor(): void {
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    
    // Colores para la barra de estado
    const lightColor = '#ffffff';
    const darkColor = '#1a1a1a';
    
    metaThemeColor.setAttribute('content', this.isDarkMode ? darkColor : lightColor);
  }
}