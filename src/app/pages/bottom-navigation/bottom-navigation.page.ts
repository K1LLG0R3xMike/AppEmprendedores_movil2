import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-bottom-navigation',
  templateUrl: './bottom-navigation.page.html',
  styleUrls: ['./bottom-navigation.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class BottomNavigationPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
