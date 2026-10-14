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
    this.isDarkMode = isDark;
    
    try {
      await Preferences.set({
        key: this.darkModeKey,
        value: JSON.stringify(this.isDarkMode)
      });
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
    
    this.applyTheme();
  }

  getDarkMode(): boolean {
    return this.isDarkMode;
  }

  private applyTheme(): void {
    
    document.body.classList.toggle('dark', this.isDarkMode);
    
    // También aplicar al elemento html para mayor compatibilidad
    document.documentElement.classList.toggle('dark', this.isDarkMode);
    
    
    // Actualizar la meta tag de color de la barra de estado
    this.updateStatusBarColor();
    
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