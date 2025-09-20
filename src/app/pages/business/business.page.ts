import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, 
  IonCard, 
  IonCardContent, 
  IonIcon, 
  IonButton, 
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonDatetime
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  business, 
  pencil, 
  save, 
  trash, 
  calendarOutline 
} from 'ionicons/icons';

interface BusinessData {
  name: string;
  type: string;
  sector: string;
  startDate: string;
}

interface SelectOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-business',
  templateUrl: './business.page.html',
  styleUrls: ['./business.page.scss'],
  standalone: true,
  imports: [
    IonContent, 
    IonCard, 
    IonCardContent, 
    IonIcon, 
    IonButton, 
    IonLabel,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonDatetime,
    CommonModule, 
    FormsModule
  ]
})
export class BusinessPage implements OnInit {
  isEditing = false;
  
  businessData: BusinessData = {
    name: 'Mi Tienda Online',
    type: 'ecommerce',
    sector: 'retail',
    startDate: '2023-01-15'
  };

  businessTypes: SelectOption[] = [
    { value: 'ecommerce', label: 'E-commerce' },
    { value: 'retail', label: 'Retail' },
    { value: 'services', label: 'Servicios' },
    { value: 'restaurant', label: 'Restaurante' },
    { value: 'consulting', label: 'Consultoría' }
  ];

  sectors: SelectOption[] = [
    { value: 'retail', label: 'Retail' },
    { value: 'technology', label: 'Tecnología' },
    { value: 'food', label: 'Alimentación' },
    { value: 'fashion', label: 'Moda' },
    { value: 'health', label: 'Salud' },
    { value: 'education', label: 'Educación' }
  ];

  constructor() {
    addIcons({ 
      business, 
      pencil, 
      save, 
      trash, 
      calendarOutline 
    });
  }

  ngOnInit() {
  }

  isDarkMode(): boolean {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  toggleEdit(): void {
    this.isEditing = true;
  }

  handleSave(): void {
    this.isEditing = false;
    // TODO: Implement save logic
    console.log('Saving business data:', this.businessData);
  }

  handleCancel(): void {
    this.isEditing = false;
    // TODO: Reset form data to original values
  }

  handleDelete(): void {
    // TODO: Implement delete logic with confirmation
    console.log('Delete business');
  }
}
