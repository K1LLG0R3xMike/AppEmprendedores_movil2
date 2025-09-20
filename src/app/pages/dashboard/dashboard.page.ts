import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonContent, 
  IonCard, 
  IonCardContent, 
  IonCardHeader, 
  IonCardTitle, 
  IonIcon, 
  IonButton 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  cashOutline, 
  arrowUpOutline, 
  arrowDownOutline, 
  cubeOutline, 
  hardwareChipOutline, 
  businessOutline, 
  trendingUpOutline,
  trendingDownOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [
    IonContent, 
    IonCard, 
    IonCardContent, 
    IonCardHeader, 
    IonCardTitle, 
    IonIcon, 
    IonButton,
    CommonModule, 
    FormsModule
  ]
})
export class DashboardPage implements OnInit {

  constructor(private router: Router) {
    addIcons({ 
      cashOutline, 
      arrowUpOutline, 
      arrowDownOutline, 
      cubeOutline, 
      hardwareChipOutline, 
      businessOutline, 
      trendingUpOutline,
      trendingDownOutline
    });
  }

  ngOnInit() {
  }

  isDarkMode(): boolean {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  goTo(route: string): void {
    this.router.navigate([route]);
  }

}
