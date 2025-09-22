import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { ThemeService } from './app/services/theme.service';
import { APP_INITIALIZER } from '@angular/core';

// Initialize theme service
function initializeTheme(themeService: ThemeService) {
  return () => themeService.initializeTheme();
}

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(withInterceptorsFromDi()),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeTheme,
      deps: [ThemeService],
      multi: true
    }
  ],
});
